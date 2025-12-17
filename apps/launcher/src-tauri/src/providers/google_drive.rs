use super::{ResultCategory, ResultIcon, SearchProvider, SearchResult};
use crate::oauth::OAuthFlow;
use parking_lot::RwLock;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;

pub struct GoogleDriveProvider {
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
struct DriveSearchResponse {
    files: Option<Vec<DriveFile>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DriveFile {
    id: String,
    name: String,
    mime_type: String,
    web_view_link: Option<String>,
    icon_link: Option<String>,
    modified_time: Option<String>,
    owners: Option<Vec<DriveOwner>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DriveOwner {
    display_name: String,
}

impl GoogleDriveProvider {
    pub fn new(oauth_flow: Arc<OAuthFlow>) -> Self {
        Self {
            oauth_flow,
            cache: RwLock::new(SearchCache::new()),
        }
    }

    fn get_token_sync(&self) -> Option<String> {
        self.oauth_flow.get_token_if_valid("google")
    }

    fn get_file_emoji(mime_type: &str) -> &'static str {
        match mime_type {
            "application/vnd.google-apps.document" => "📄",
            "application/vnd.google-apps.spreadsheet" => "📊",
            "application/vnd.google-apps.presentation" => "📽️",
            "application/vnd.google-apps.form" => "📝",
            "application/vnd.google-apps.folder" => "📁",
            "application/pdf" => "📕",
            "image/jpeg" | "image/png" | "image/gif" | "image/webp" => "🖼️",
            "video/mp4" | "video/quicktime" | "video/webm" => "🎬",
            "audio/mpeg" | "audio/wav" | "audio/ogg" => "🎵",
            "application/zip" | "application/x-rar-compressed" => "📦",
            _ if mime_type.starts_with("text/") => "📃",
            _ if mime_type.starts_with("application/vnd.google-apps") => "📄",
            _ => "📄",
        }
    }

    fn get_file_type_name(mime_type: &str) -> &'static str {
        match mime_type {
            "application/vnd.google-apps.document" => "Google Doc",
            "application/vnd.google-apps.spreadsheet" => "Google Sheet",
            "application/vnd.google-apps.presentation" => "Google Slides",
            "application/vnd.google-apps.form" => "Google Form",
            "application/vnd.google-apps.folder" => "Folder",
            "application/pdf" => "PDF",
            "image/jpeg" => "JPEG Image",
            "image/png" => "PNG Image",
            "image/gif" => "GIF",
            "video/mp4" => "MP4 Video",
            "audio/mpeg" => "MP3 Audio",
            "application/zip" => "ZIP Archive",
            "text/plain" => "Text File",
            _ if mime_type.starts_with("image/") => "Image",
            _ if mime_type.starts_with("video/") => "Video",
            _ if mime_type.starts_with("audio/") => "Audio",
            _ => "File",
        }
    }

    fn search_drive(&self, query: &str) -> Vec<SearchResult> {
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

        // Make Google Drive API request
        let client = reqwest::blocking::Client::new();
        let search_query = format!("name contains '{}' and trashed = false", query);
        let response = client
            .get("https://www.googleapis.com/drive/v3/files")
            .query(&[
                ("q", search_query.as_str()),
                ("pageSize", "10"),
                ("fields", "files(id,name,mimeType,webViewLink,iconLink,modifiedTime,owners)"),
                ("orderBy", "modifiedTime desc"),
            ])
            .header("Authorization", format!("Bearer {}", token))
            .send();

        let (results, urls): (Vec<SearchResult>, HashMap<String, String>) = match response {
            Ok(resp) if resp.status().is_success() => {
                match resp.json::<DriveSearchResponse>() {
                    Ok(data) => {
                        let mut urls = HashMap::new();
                        let results = data
                            .files
                            .unwrap_or_default()
                            .into_iter()
                            .enumerate()
                            .map(|(i, file)| {
                                let id = format!("gdrive:file:{}", file.id);
                                if let Some(link) = file.web_view_link {
                                    urls.insert(id.clone(), link);
                                }
                                
                                let file_type = Self::get_file_type_name(&file.mime_type);
                                let owner = file.owners
                                    .and_then(|o| o.first().map(|o| o.display_name.clone()))
                                    .unwrap_or_default();
                                
                                let subtitle = if owner.is_empty() {
                                    file_type.to_string()
                                } else {
                                    format!("{} • {}", file_type, owner)
                                };
                                
                                SearchResult {
                                    id,
                                    title: file.name,
                                    subtitle: Some(subtitle),
                                    icon: ResultIcon::Emoji(Self::get_file_emoji(&file.mime_type).to_string()),
                                    category: ResultCategory::Plugin,
                                    score: 100.0 - (i as f32 * 5.0),
                                }
                            })
                            .collect();
                        (results, urls)
                    }
                    Err(e) => {
                        eprintln!("Failed to parse Drive response: {}", e);
                        (Vec::new(), HashMap::new())
                    }
                }
            }
            Ok(resp) => {
                eprintln!("Google Drive API error: {}", resp.status());
                (Vec::new(), HashMap::new())
            }
            Err(e) => {
                eprintln!("Google Drive request failed: {}", e);
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

impl SearchProvider for GoogleDriveProvider {
    fn id(&self) -> &str {
        "google_drive"
    }

    fn search(&self, query: &str) -> Vec<SearchResult> {
        // Only search Google Drive if query starts with "gd " prefix
        if let Some(drive_query) = query.strip_prefix("gd ") {
            self.search_drive(drive_query.trim())
        } else {
            Vec::new()
        }
    }

    fn execute(&self, result_id: &str) -> Result<(), String> {
        if result_id == "google:connect" {
            return Ok(());
        }
        
        if result_id.starts_with("gdrive:file:") {
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
            Err("File URL not found".to_string())
        } else {
            Err("Invalid Google Drive result ID".to_string())
        }
    }
}
