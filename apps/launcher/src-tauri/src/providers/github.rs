use super::{ResultCategory, ResultIcon, SearchProvider, SearchResult};
use crate::oauth::OAuthFlow;
use parking_lot::RwLock;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;

pub struct GitHubProvider {
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
struct GitHubSearchResponse {
    items: Vec<GitHubRepo>,
}

#[derive(Debug, Deserialize)]
struct GitHubRepo {
    id: u64,
    full_name: String,
    description: Option<String>,
    html_url: String,
    stargazers_count: u32,
    language: Option<String>,
}

impl GitHubProvider {
    pub fn new(oauth_flow: Arc<OAuthFlow>) -> Self {
        Self {
            oauth_flow,
            cache: RwLock::new(SearchCache::new()),
        }
    }

    fn get_token_sync(&self) -> Option<String> {
        self.oauth_flow.get_token_if_valid("github")
    }

    fn search_github(&self, query: &str) -> Vec<SearchResult> {
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

        // Check if connected to GitHub
        if !self.oauth_flow.is_connected("github") {
            return vec![SearchResult {
                id: "github:connect".to_string(),
                title: "Connect GitHub".to_string(),
                subtitle: Some("Go to Settings → Accounts to connect GitHub".to_string()),
                icon: ResultIcon::Emoji("🔗".to_string()),
                category: ResultCategory::GitHub,
                score: 50.0,
            }];
        }

        // Get token synchronously (non-expired only)
        let token = match self.get_token_sync() {
            Some(t) => t,
            None => return Vec::new(),
        };

        // Make GitHub API request
        let client = reqwest::blocking::Client::new();
        let response = client
            .get("https://api.github.com/search/repositories")
            .query(&[("q", query), ("per_page", "8")])
            .header("Authorization", format!("Bearer {}", token))
            .header("Accept", "application/vnd.github+json")
            .header("User-Agent", "Launcher-App")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .send();

        let (results, urls): (Vec<SearchResult>, HashMap<String, String>) = match response {
            Ok(resp) if resp.status().is_success() => match resp.json::<GitHubSearchResponse>() {
                Ok(data) => {
                    let mut urls = HashMap::new();
                    let results = data
                        .items
                        .into_iter()
                        .enumerate()
                        .map(|(i, repo)| {
                            let id = format!("github:repo:{}", repo.id);
                            urls.insert(id.clone(), repo.html_url);

                            let lang = repo.language.as_deref().unwrap_or("");
                            let subtitle = match &repo.description {
                                Some(desc) if !desc.is_empty() => desc.clone(),
                                _ => format!("⭐ {} · {}", repo.stargazers_count, lang),
                            };

                            SearchResult {
                                id,
                                title: repo.full_name,
                                subtitle: Some(subtitle),
                                icon: ResultIcon::Emoji("📦".to_string()),
                                category: ResultCategory::GitHub,
                                score: 100.0 - (i as f32 * 5.0),
                            }
                        })
                        .collect();
                    (results, urls)
                }
                Err(_) => (Vec::new(), HashMap::new()),
            },
            Ok(resp) => {
                eprintln!("GitHub API error: {}", resp.status());
                (Vec::new(), HashMap::new())
            }
            Err(e) => {
                eprintln!("GitHub request failed: {}", e);
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

impl SearchProvider for GitHubProvider {
    fn id(&self) -> &str {
        "github"
    }

    fn search(&self, query: &str) -> Vec<SearchResult> {
        // Only search GitHub if query starts with "gh " prefix
        if let Some(gh_query) = query.strip_prefix("gh ") {
            self.search_github(gh_query.trim())
        } else {
            Vec::new()
        }
    }

    fn execute(&self, result_id: &str) -> Result<(), String> {
        if result_id == "github:connect" {
            return Ok(());
        }

        if result_id.starts_with("github:repo:") {
            let cache = self.cache.read();
            if let Some(url) = cache.urls.get(result_id) {
                std::process::Command::new("xdg-open")
                    .arg(url)
                    .spawn()
                    .map_err(|e| e.to_string())?;
                return Ok(());
            }
            Err("Repository URL not found".to_string())
        } else {
            Err("Invalid GitHub result ID".to_string())
        }
    }
}
