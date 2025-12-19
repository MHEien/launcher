use super::{ResultCategory, ResultIcon, SearchProvider, SearchResult};

/// Search engines supported for web search
#[derive(Clone, Copy)]
pub enum SearchEngine {
    Google,
    DuckDuckGo,
    Bing,
    GitHub,
    StackOverflow,
    YouTube,
}

impl SearchEngine {
    fn name(&self) -> &'static str {
        match self {
            SearchEngine::Google => "Google",
            SearchEngine::DuckDuckGo => "DuckDuckGo",
            SearchEngine::Bing => "Bing",
            SearchEngine::GitHub => "GitHub",
            SearchEngine::StackOverflow => "Stack Overflow",
            SearchEngine::YouTube => "YouTube",
        }
    }

    fn icon(&self) -> &'static str {
        match self {
            SearchEngine::Google => "🔍",
            SearchEngine::DuckDuckGo => "🦆",
            SearchEngine::Bing => "🅱️",
            SearchEngine::GitHub => "🐙",
            SearchEngine::StackOverflow => "📚",
            SearchEngine::YouTube => "▶️",
        }
    }

    fn search_url(&self, query: &str) -> String {
        let encoded_query = urlencoding::encode(query);
        match self {
            SearchEngine::Google => format!("https://www.google.com/search?q={}", encoded_query),
            SearchEngine::DuckDuckGo => format!("https://duckduckgo.com/?q={}", encoded_query),
            SearchEngine::Bing => format!("https://www.bing.com/search?q={}", encoded_query),
            SearchEngine::GitHub => {
                format!("https://github.com/search?q={}&type=repositories", encoded_query)
            }
            SearchEngine::StackOverflow => {
                format!("https://stackoverflow.com/search?q={}", encoded_query)
            }
            SearchEngine::YouTube => {
                format!("https://www.youtube.com/results?search_query={}", encoded_query)
            }
        }
    }

    fn shortcut(&self) -> Option<&'static str> {
        match self {
            SearchEngine::Google => Some("g:"),
            SearchEngine::DuckDuckGo => Some("ddg:"),
            SearchEngine::Bing => None,
            SearchEngine::GitHub => Some("gh:"),
            SearchEngine::StackOverflow => Some("so:"),
            SearchEngine::YouTube => Some("yt:"),
        }
    }
}

pub struct WebSearchProvider {
    default_engine: SearchEngine,
}

impl WebSearchProvider {
    pub fn new() -> Self {
        Self {
            default_engine: SearchEngine::Google,
        }
    }

    /// Check if query matches a search engine shortcut
    fn detect_engine_shortcut(query: &str) -> Option<(SearchEngine, &str)> {
        let query_lower = query.to_lowercase();

        let shortcuts = [
            ("g:", SearchEngine::Google),
            ("google:", SearchEngine::Google),
            ("ddg:", SearchEngine::DuckDuckGo),
            ("duck:", SearchEngine::DuckDuckGo),
            ("bing:", SearchEngine::Bing),
            ("gh:", SearchEngine::GitHub),
            ("github:", SearchEngine::GitHub),
            ("so:", SearchEngine::StackOverflow),
            ("stack:", SearchEngine::StackOverflow),
            ("yt:", SearchEngine::YouTube),
            ("youtube:", SearchEngine::YouTube),
            ("?", SearchEngine::Google), // Quick search shortcut
        ];

        for (prefix, engine) in shortcuts {
            if query_lower.starts_with(prefix) {
                let search_query = query[prefix.len()..].trim();
                if !search_query.is_empty() {
                    return Some((engine, search_query));
                }
            }
        }

        None
    }
}

impl SearchProvider for WebSearchProvider {
    fn id(&self) -> &str {
        "websearch"
    }

    fn search(&self, query: &str) -> Vec<SearchResult> {
        let trimmed = query.trim();
        if trimmed.is_empty() || trimmed.len() < 2 {
            return vec![];
        }

        let mut results = Vec::new();

        // Check for explicit search engine shortcut
        if let Some((engine, search_query)) = Self::detect_engine_shortcut(query) {
            results.push(SearchResult {
                id: format!("websearch:{}:{}", engine.name().to_lowercase(), search_query),
                title: format!("Search {} for \"{}\"", engine.name(), search_query),
                subtitle: Some(engine.search_url(search_query)),
                icon: ResultIcon::Emoji(engine.icon().to_string()),
                category: ResultCategory::WebSearch,
                score: 85.0,
            });
            return results;
        }

        // Only show web search suggestions if query is long enough and looks like a search
        // This is a "fallback" search that appears when other results might not match
        if trimmed.len() >= 3 {
            // Add default search engine
            results.push(SearchResult {
                id: format!(
                    "websearch:{}:{}",
                    self.default_engine.name().to_lowercase(),
                    trimmed
                ),
                title: format!("Search {} for \"{}\"", self.default_engine.name(), trimmed),
                subtitle: Some("Web search".to_string()),
                icon: ResultIcon::Emoji(self.default_engine.icon().to_string()),
                category: ResultCategory::WebSearch,
                // Lower score so it appears below more specific results
                score: 15.0,
            });

            // Add DuckDuckGo as alternative if Google is default
            if matches!(self.default_engine, SearchEngine::Google) {
                results.push(SearchResult {
                    id: format!("websearch:duckduckgo:{}", trimmed),
                    title: format!("Search DuckDuckGo for \"{}\"", trimmed),
                    subtitle: Some("Private web search".to_string()),
                    icon: ResultIcon::Emoji("🦆".to_string()),
                    category: ResultCategory::WebSearch,
                    score: 10.0,
                });
            }
        }

        results
    }

    fn execute(&self, result_id: &str) -> Result<(), String> {
        let Some(rest) = result_id.strip_prefix("websearch:") else {
            return Err("Invalid web search result".to_string());
        };

        // Parse engine:query format
        let parts: Vec<&str> = rest.splitn(2, ':').collect();
        if parts.len() != 2 {
            return Err("Invalid web search format".to_string());
        }

        let (engine_name, query) = (parts[0], parts[1]);

        let engine = match engine_name {
            "google" => SearchEngine::Google,
            "duckduckgo" => SearchEngine::DuckDuckGo,
            "bing" => SearchEngine::Bing,
            "github" => SearchEngine::GitHub,
            "stackoverflow" | "stack overflow" => SearchEngine::StackOverflow,
            "youtube" => SearchEngine::YouTube,
            _ => return Err(format!("Unknown search engine: {}", engine_name)),
        };

        let url = engine.search_url(query);

        #[cfg(target_os = "linux")]
        {
            std::process::Command::new("xdg-open")
                .arg(&url)
                .spawn()
                .map_err(|e| format!("Failed to open URL: {}", e))?;
        }

        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .arg(&url)
                .spawn()
                .map_err(|e| format!("Failed to open URL: {}", e))?;
        }

        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("cmd")
                .args(["/C", "start", "", &url])
                .spawn()
                .map_err(|e| format!("Failed to open URL: {}", e))?;
        }

        Ok(())
    }
}

