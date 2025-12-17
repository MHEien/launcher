use super::{ResultCategory, ResultIcon, SearchProvider, SearchResult};
use crate::oauth::OAuthFlow;
use parking_lot::RwLock;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;

pub struct NotionProvider {
    oauth_flow: Arc<OAuthFlow>,
    cache: RwLock<SearchCache>,
}

struct SearchCache {
    query: String,
    results: Vec<SearchResult>,
    urls: HashMap<String, String>,
    timestamp: std::time::Instant,
}

impl SearchCache {
    fn new() -> Self {
        Self {
            query: String::new(),
            results: Vec::new(),
            urls: HashMap::new(),
            timestamp: std::time::Instant::now(),
        }
    }

    fn is_valid(&self, query: &str) -> bool {
        self.query == query && self.timestamp.elapsed().as_secs() < 60
    }
}

#[derive(Debug, Deserialize)]
struct NotionSearchResponse {
    results: Vec<NotionPage>,
}

#[derive(Debug, Deserialize)]
struct NotionPage {
    id: String,
    url: String,
    #[serde(default)]
    icon: Option<NotionIcon>,
    properties: NotionProperties,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum NotionIcon {
    #[serde(rename = "emoji")]
    Emoji { emoji: String },
    #[serde(rename = "external")]
    External { external: NotionExternalUrl },
    #[serde(rename = "file")]
    File { file: NotionFileUrl },
}

#[derive(Debug, Deserialize)]
struct NotionExternalUrl {
    url: String,
}

#[derive(Debug, Deserialize)]
struct NotionFileUrl {
    url: String,
}

#[derive(Debug, Deserialize)]
struct NotionProperties {
    #[serde(default)]
    title: Option<NotionTitle>,
    #[serde(default)]
    #[serde(rename = "Name")]
    name: Option<NotionTitle>,
}

#[derive(Debug, Deserialize)]
struct NotionTitle {
    title: Vec<NotionRichText>,
}

#[derive(Debug, Deserialize)]
struct NotionRichText {
    plain_text: String,
}

impl NotionProvider {
    pub fn new(oauth_flow: Arc<OAuthFlow>) -> Self {
        Self {
            oauth_flow,
            cache: RwLock::new(SearchCache::new()),
        }
    }

    fn get_token_sync(&self) -> Option<String> {
        self.oauth_flow.get_token_if_valid("notion")
    }

    fn get_page_title(page: &NotionPage) -> String {
        // Try to get title from properties.title or properties.Name
        if let Some(title_prop) = &page.properties.title {
            if let Some(text) = title_prop.title.first() {
                return text.plain_text.clone();
            }
        }
        if let Some(name_prop) = &page.properties.name {
            if let Some(text) = name_prop.title.first() {
                return text.plain_text.clone();
            }
        }
        "Untitled".to_string()
    }

    fn get_page_icon(page: &NotionPage) -> ResultIcon {
        match &page.icon {
            Some(NotionIcon::Emoji { emoji }) => ResultIcon::Emoji(emoji.clone()),
            _ => ResultIcon::Emoji("📄".to_string()),
        }
    }

    fn search_notion(&self, query: &str) -> Vec<SearchResult> {
        if query.len() < 2 {
            return Vec::new();
        }

        // Check cache first
        {
            let cache = self.cache.read();
            if cache.is_valid(query) {
                return cache.results.clone();
            }
        }

        // Check if connected to Notion
        if !self.oauth_flow.is_connected("notion") {
            return vec![SearchResult {
                id: "notion:connect".to_string(),
                title: "Connect Notion".to_string(),
                subtitle: Some("Go to Settings → Accounts to connect Notion".to_string()),
                icon: ResultIcon::Emoji("🔗".to_string()),
                category: ResultCategory::Plugin, // Using Plugin as generic category
                score: 50.0,
            }];
        }

        // Get token synchronously
        let token = match self.get_token_sync() {
            Some(t) => t,
            None => return Vec::new(),
        };

        // Make Notion API request
        let client = reqwest::blocking::Client::new();
        let response = client
            .post("https://api.notion.com/v1/search")
            .header("Authorization", format!("Bearer {}", token))
            .header("Notion-Version", "2022-06-28")
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "query": query,
                "page_size": 8,
                "filter": {
                    "property": "object",
                    "value": "page"
                }
            }))
            .send();

        let (results, urls): (Vec<SearchResult>, HashMap<String, String>) = match response {
            Ok(resp) if resp.status().is_success() => match resp.json::<NotionSearchResponse>() {
                Ok(data) => {
                    let mut urls = HashMap::new();
                    let results = data
                        .results
                        .into_iter()
                        .enumerate()
                        .map(|(i, page)| {
                            let id = format!("notion:page:{}", page.id);
                            urls.insert(id.clone(), page.url.clone());

                            let title = Self::get_page_title(&page);
                            let icon = Self::get_page_icon(&page);

                            SearchResult {
                                id,
                                title,
                                subtitle: Some("Notion Page".to_string()),
                                icon,
                                category: ResultCategory::Plugin,
                                score: 100.0 - (i as f32 * 5.0),
                            }
                        })
                        .collect();
                    (results, urls)
                }
                Err(e) => {
                    eprintln!("Failed to parse Notion response: {}", e);
                    (Vec::new(), HashMap::new())
                }
            },
            Ok(resp) => {
                eprintln!("Notion API error: {}", resp.status());
                (Vec::new(), HashMap::new())
            }
            Err(e) => {
                eprintln!("Notion request failed: {}", e);
                (Vec::new(), HashMap::new())
            }
        };

        // Update cache
        {
            let mut cache = self.cache.write();
            cache.query = query.to_string();
            cache.results = results.clone();
            cache.urls = urls;
            cache.timestamp = std::time::Instant::now();
        }

        results
    }
}

impl SearchProvider for NotionProvider {
    fn id(&self) -> &str {
        "notion"
    }

    fn search(&self, query: &str) -> Vec<SearchResult> {
        // Only search Notion if query starts with "nt " prefix
        if let Some(notion_query) = query.strip_prefix("nt ") {
            self.search_notion(notion_query.trim())
        } else {
            Vec::new()
        }
    }

    fn execute(&self, result_id: &str) -> Result<(), String> {
        if result_id == "notion:connect" {
            return Ok(());
        }

        if result_id.starts_with("notion:page:") {
            let cache = self.cache.read();
            if let Some(url) = cache.urls.get(result_id) {
                #[cfg(target_os = "linux")]
                {
                    std::process::Command::new("xdg-open")
                        .arg(url)
                        .spawn()
                        .map_err(|e| e.to_string())?;
                }
                #[cfg(target_os = "macos")]
                {
                    std::process::Command::new("open")
                        .arg(url)
                        .spawn()
                        .map_err(|e| e.to_string())?;
                }
                #[cfg(target_os = "windows")]
                {
                    std::process::Command::new("cmd")
                        .args(["/C", "start", "", url])
                        .spawn()
                        .map_err(|e| e.to_string())?;
                }
                return Ok(());
            }
            Err("Page URL not found".to_string())
        } else {
            Err("Invalid Notion result ID".to_string())
        }
    }
}
