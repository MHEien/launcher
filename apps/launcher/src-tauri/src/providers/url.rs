use super::{ResultCategory, ResultIcon, SearchProvider, SearchResult};
use url::Url;

pub struct UrlProvider;

impl UrlProvider {
    pub fn new() -> Self {
        Self
    }

    /// Check if the query looks like a URL
    fn is_url_like(query: &str) -> bool {
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return false;
        }

        // Explicit protocol
        if trimmed.starts_with("http://")
            || trimmed.starts_with("https://")
            || trimmed.starts_with("ftp://")
            || trimmed.starts_with("file://")
        {
            return true;
        }

        // Common domain patterns
        let domain_patterns = [
            ".com", ".org", ".net", ".io", ".dev", ".app", ".co", ".ai", ".gg",
            ".edu", ".gov", ".me", ".tv", ".info", ".biz", ".xyz",
        ];

        // Check if it contains a domain-like pattern
        for pattern in domain_patterns {
            if trimmed.contains(pattern) {
                // Make sure it's not just a filename
                let parts: Vec<&str> = trimmed.split(pattern).collect();
                if parts.len() >= 2 && !parts[0].is_empty() {
                    // Check it looks like a domain (has dots or is before TLD)
                    return true;
                }
            }
        }

        // Check for localhost patterns
        if trimmed.starts_with("localhost") || trimmed.contains("localhost:") {
            return true;
        }

        // Check for IP address patterns (simple check)
        if trimmed.chars().filter(|c| *c == '.').count() == 3 {
            let parts: Vec<&str> = trimmed.split('.').collect();
            if parts.len() == 4 && parts.iter().all(|p| p.parse::<u8>().is_ok()) {
                return true;
            }
        }

        false
    }

    /// Try to normalize the URL (add https:// if missing)
    fn normalize_url(query: &str) -> Option<String> {
        let trimmed = query.trim();

        // If it already has a protocol, validate it
        if trimmed.starts_with("http://")
            || trimmed.starts_with("https://")
            || trimmed.starts_with("ftp://")
            || trimmed.starts_with("file://")
        {
            if Url::parse(trimmed).is_ok() {
                return Some(trimmed.to_string());
            }
            return None;
        }

        // Handle localhost
        if trimmed.starts_with("localhost") {
            let url = format!("http://{}", trimmed);
            if Url::parse(&url).is_ok() {
                return Some(url);
            }
            return None;
        }

        // Try adding https://
        let url = format!("https://{}", trimmed);
        if Url::parse(&url).is_ok() {
            return Some(url);
        }

        None
    }

    /// Get a display-friendly version of the URL
    fn get_display_url(url: &str) -> String {
        url.trim_start_matches("https://")
            .trim_start_matches("http://")
            .trim_end_matches('/')
            .to_string()
    }
}

impl SearchProvider for UrlProvider {
    fn id(&self) -> &str {
        "url"
    }

    fn search(&self, query: &str) -> Vec<SearchResult> {
        if !Self::is_url_like(query) {
            return vec![];
        }

        let Some(normalized_url) = Self::normalize_url(query) else {
            return vec![];
        };

        let display_url = Self::get_display_url(&normalized_url);

        vec![SearchResult {
            id: format!("url:{}", normalized_url),
            title: format!("Open {}", display_url),
            subtitle: Some("Open in browser".to_string()),
            icon: ResultIcon::Emoji("🌐".to_string()),
            category: ResultCategory::URL,
            score: 95.0, // High priority for URLs
        }]
    }

    fn execute(&self, result_id: &str) -> Result<(), String> {
        if let Some(url) = result_id.strip_prefix("url:") {
            #[cfg(target_os = "linux")]
            {
                std::process::Command::new("xdg-open")
                    .arg(url)
                    .spawn()
                    .map_err(|e| format!("Failed to open URL: {}", e))?;
            }

            #[cfg(target_os = "macos")]
            {
                std::process::Command::new("open")
                    .arg(url)
                    .spawn()
                    .map_err(|e| format!("Failed to open URL: {}", e))?;
            }

            #[cfg(target_os = "windows")]
            {
                std::process::Command::new("cmd")
                    .args(["/C", "start", "", url])
                    .spawn()
                    .map_err(|e| format!("Failed to open URL: {}", e))?;
            }

            Ok(())
        } else {
            Err("Invalid URL result".to_string())
        }
    }
}

