use super::{ResultCategory, ResultIcon, SearchProvider, SearchResult};
use crate::oauth::OAuthFlow;
use parking_lot::RwLock;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;

pub struct SlackProvider {
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
struct SlackSearchResponse {
    ok: bool,
    messages: Option<SlackMessages>,
}

#[derive(Debug, Deserialize)]
struct SlackMessages {
    matches: Vec<SlackMessage>,
}

#[derive(Debug, Deserialize)]
struct SlackMessage {
    iid: String,
    text: String,
    username: Option<String>,
    channel: SlackChannel,
    permalink: String,
    ts: String,
}

#[derive(Debug, Deserialize)]
struct SlackChannel {
    id: String,
    name: Option<String>,
}

impl SlackProvider {
    pub fn new(oauth_flow: Arc<OAuthFlow>) -> Self {
        Self {
            oauth_flow,
            cache: RwLock::new(SearchCache::new()),
        }
    }

    fn get_token_sync(&self) -> Option<String> {
        self.oauth_flow.get_token_if_valid("slack")
    }

    fn truncate_text(text: &str, max_len: usize) -> String {
        if text.len() <= max_len {
            text.to_string()
        } else {
            format!("{}...", &text[..max_len.saturating_sub(3)])
        }
    }

    fn search_slack(&self, query: &str) -> Vec<SearchResult> {
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

        // Check if connected to Slack
        if !self.oauth_flow.is_connected("slack") {
            return vec![SearchResult {
                id: "slack:connect".to_string(),
                title: "Connect Slack".to_string(),
                subtitle: Some("Go to Settings → Accounts to connect Slack".to_string()),
                icon: ResultIcon::Emoji("🔗".to_string()),
                category: ResultCategory::Plugin,
                score: 50.0,
            }];
        }

        // Get token synchronously
        let token = match self.get_token_sync() {
            Some(t) => t,
            None => return Vec::new(),
        };

        // Make Slack API request
        let client = reqwest::blocking::Client::new();
        let response = client
            .get("https://slack.com/api/search.messages")
            .query(&[("query", query), ("count", "8")])
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .send();

        let (results, urls): (Vec<SearchResult>, HashMap<String, String>) = match response {
            Ok(resp) if resp.status().is_success() => {
                match resp.json::<SlackSearchResponse>() {
                    Ok(data) if data.ok => {
                        let mut urls = HashMap::new();
                        let results = data
                            .messages
                            .map(|m| m.matches)
                            .unwrap_or_default()
                            .into_iter()
                            .enumerate()
                            .map(|(i, msg)| {
                                let id = format!("slack:msg:{}", msg.iid);
                                urls.insert(id.clone(), msg.permalink.clone());
                                
                                let channel_name = msg.channel.name.as_deref().unwrap_or("DM");
                                let username = msg.username.as_deref().unwrap_or("Unknown");
                                let title = Self::truncate_text(&msg.text, 60);
                                let subtitle = format!("#{} • {}", channel_name, username);
                                
                                SearchResult {
                                    id,
                                    title,
                                    subtitle: Some(subtitle),
                                    icon: ResultIcon::Emoji("💬".to_string()),
                                    category: ResultCategory::Plugin,
                                    score: 100.0 - (i as f32 * 5.0),
                                }
                            })
                            .collect();
                        (results, urls)
                    }
                    Ok(data) => {
                        eprintln!("Slack API returned ok=false");
                        (Vec::new(), HashMap::new())
                    }
                    Err(e) => {
                        eprintln!("Failed to parse Slack response: {}", e);
                        (Vec::new(), HashMap::new())
                    }
                }
            }
            Ok(resp) => {
                eprintln!("Slack API error: {}", resp.status());
                (Vec::new(), HashMap::new())
            }
            Err(e) => {
                eprintln!("Slack request failed: {}", e);
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

impl SearchProvider for SlackProvider {
    fn id(&self) -> &str {
        "slack"
    }

    fn search(&self, query: &str) -> Vec<SearchResult> {
        // Only search Slack if query starts with "sl " prefix
        if let Some(slack_query) = query.strip_prefix("sl ") {
            self.search_slack(slack_query.trim())
        } else {
            Vec::new()
        }
    }

    fn execute(&self, result_id: &str) -> Result<(), String> {
        if result_id == "slack:connect" {
            return Ok(());
        }
        
        if result_id.starts_with("slack:msg:") {
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
            Err("Message URL not found".to_string())
        } else {
            Err("Invalid Slack result ID".to_string())
        }
    }
}
