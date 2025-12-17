use super::{ResultCategory, ResultIcon, SearchProvider, SearchResult};
use crate::oauth::OAuthFlow;
use parking_lot::RwLock;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;
use chrono::{DateTime, Utc, Local};

pub struct GoogleCalendarProvider {
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
struct CalendarListResponse {
    items: Option<Vec<CalendarEvent>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CalendarEvent {
    id: String,
    summary: Option<String>,
    description: Option<String>,
    html_link: Option<String>,
    start: Option<EventTime>,
    end: Option<EventTime>,
    location: Option<String>,
    organizer: Option<EventOrganizer>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EventTime {
    date_time: Option<String>,
    date: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EventOrganizer {
    display_name: Option<String>,
    email: Option<String>,
}

impl GoogleCalendarProvider {
    pub fn new(oauth_flow: Arc<OAuthFlow>) -> Self {
        Self {
            oauth_flow,
            cache: RwLock::new(SearchCache::new()),
        }
    }

    fn get_token_sync(&self) -> Option<String> {
        self.oauth_flow.get_token_if_valid("google")
    }

    fn format_event_time(event: &CalendarEvent) -> String {
        if let Some(start) = &event.start {
            if let Some(dt_str) = &start.date_time {
                if let Ok(dt) = DateTime::parse_from_rfc3339(dt_str) {
                    let local: DateTime<Local> = dt.into();
                    return local.format("%b %d, %H:%M").to_string();
                }
            }
            if let Some(date) = &start.date {
                return format!("{} (All day)", date);
            }
        }
        "No time".to_string()
    }

    fn search_calendar(&self, query: &str) -> Vec<SearchResult> {
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

        // Check if connected to Google
        if !self.oauth_flow.is_connected("google") {
            return vec![SearchResult {
                id: "google:connect".to_string(),
                title: "Connect Google".to_string(),
                subtitle: Some("Go to Settings → Accounts to connect Google".to_string()),
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

        // Get time range (now to 30 days from now)
        let now = Utc::now();
        let time_min = now.to_rfc3339();
        let time_max = (now + chrono::Duration::days(30)).to_rfc3339();

        // Make Google Calendar API request
        let client = reqwest::blocking::Client::new();
        let response = client
            .get("https://www.googleapis.com/calendar/v3/calendars/primary/events")
            .query(&[
                ("q", query),
                ("timeMin", &time_min),
                ("timeMax", &time_max),
                ("maxResults", "10"),
                ("singleEvents", "true"),
                ("orderBy", "startTime"),
            ])
            .header("Authorization", format!("Bearer {}", token))
            .send();

        let (results, urls): (Vec<SearchResult>, HashMap<String, String>) = match response {
            Ok(resp) if resp.status().is_success() => {
                match resp.json::<CalendarListResponse>() {
                    Ok(data) => {
                        let mut urls = HashMap::new();
                        let results = data
                            .items
                            .unwrap_or_default()
                            .into_iter()
                            .enumerate()
                            .map(|(i, event)| {
                                let id = format!("gcal:event:{}", event.id);
                                if let Some(link) = &event.html_link {
                                    urls.insert(id.clone(), link.clone());
                                }
                                
                                let title = event.summary.clone().unwrap_or_else(|| "(No title)".to_string());
                                let time = Self::format_event_time(&event);
                                let location = event.location.as_deref().unwrap_or("");
                                
                                let subtitle = if location.is_empty() {
                                    time
                                } else {
                                    format!("{} • {}", time, location)
                                };
                                
                                SearchResult {
                                    id,
                                    title,
                                    subtitle: Some(subtitle),
                                    icon: ResultIcon::Emoji("📅".to_string()),
                                    category: ResultCategory::Plugin,
                                    score: 100.0 - (i as f32 * 5.0),
                                }
                            })
                            .collect();
                        (results, urls)
                    }
                    Err(e) => {
                        eprintln!("Failed to parse Calendar response: {}", e);
                        (Vec::new(), HashMap::new())
                    }
                }
            }
            Ok(resp) => {
                eprintln!("Google Calendar API error: {}", resp.status());
                (Vec::new(), HashMap::new())
            }
            Err(e) => {
                eprintln!("Google Calendar request failed: {}", e);
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

impl SearchProvider for GoogleCalendarProvider {
    fn id(&self) -> &str {
        "google_calendar"
    }

    fn search(&self, query: &str) -> Vec<SearchResult> {
        // Only search Google Calendar if query starts with "gc " prefix
        if let Some(cal_query) = query.strip_prefix("gc ") {
            self.search_calendar(cal_query.trim())
        } else {
            Vec::new()
        }
    }

    fn execute(&self, result_id: &str) -> Result<(), String> {
        if result_id == "google:connect" {
            return Ok(());
        }
        
        if result_id.starts_with("gcal:event:") {
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
            Err("Event URL not found".to_string())
        } else {
            Err("Invalid Google Calendar result ID".to_string())
        }
    }
}
