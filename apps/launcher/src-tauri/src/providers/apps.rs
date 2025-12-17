use super::{ResultCategory, ResultIcon, SearchProvider, SearchResult};
use freedesktop_desktop_entry::{default_paths, DesktopEntry, Iter};
use std::collections::HashMap;
use std::sync::RwLock;

pub struct AppProvider {
    apps: RwLock<Vec<AppEntry>>,
}

#[derive(Debug, Clone)]
struct AppEntry {
    id: String,
    name: String,
    generic_name: Option<String>,
    comment: Option<String>,
    exec: String,
    icon: Option<String>,
    keywords: Vec<String>,
}

impl AppProvider {
    pub fn new() -> Self {
        let provider = Self {
            apps: RwLock::new(Vec::new()),
        };
        provider.refresh_apps();
        provider
    }

    pub fn refresh_apps(&self) {
        let mut apps = Vec::new();
        let mut seen: HashMap<String, bool> = HashMap::new();
        let locales = &["en"];

        for path in Iter::new(default_paths()) {
            if let Ok(entry_data) = std::fs::read_to_string(&path) {
                if let Ok(desktop) = DesktopEntry::from_str(&path, &entry_data, Some(locales)) {
                    if desktop.no_display() {
                        continue;
                    }

                    let name = desktop.name(locales).unwrap_or_default().to_string();
                    if name.is_empty() || seen.contains_key(&name) {
                        continue;
                    }
                    seen.insert(name.clone(), true);

                    let exec = desktop.exec().unwrap_or_default().to_string();
                    if exec.is_empty() {
                        continue;
                    }

                    let exec_clean = exec
                        .split_whitespace()
                        .next()
                        .unwrap_or(&exec)
                        .replace("%u", "")
                        .replace("%U", "")
                        .replace("%f", "")
                        .replace("%F", "");

                    let keywords: Vec<String> = desktop
                        .keywords(locales)
                        .map(|k| k.iter().map(|s| s.to_string()).collect())
                        .unwrap_or_default();

                    apps.push(AppEntry {
                        id: path.to_string_lossy().to_string(),
                        name: name.clone(),
                        generic_name: desktop.generic_name(locales).map(|s| s.to_string()),
                        comment: desktop.comment(locales).map(|s| s.to_string()),
                        exec: exec_clean,
                        icon: desktop.icon().map(|s| s.to_string()),
                        keywords,
                    });
                }
            }
        }

        if let Ok(mut lock) = self.apps.write() {
            *lock = apps;
        }
    }

    fn score_match(query: &str, app: &AppEntry) -> f32 {
        let query_lower = query.to_lowercase();
        let name_lower = app.name.to_lowercase();

        if name_lower == query_lower {
            return 100.0;
        }

        if name_lower.starts_with(&query_lower) {
            return 90.0 + (query_lower.len() as f32 / name_lower.len() as f32) * 10.0;
        }

        if name_lower.contains(&query_lower) {
            return 70.0 + (query_lower.len() as f32 / name_lower.len() as f32) * 10.0;
        }

        if let Some(ref generic) = app.generic_name {
            let generic_lower = generic.to_lowercase();
            if generic_lower.contains(&query_lower) {
                return 50.0;
            }
        }

        for keyword in &app.keywords {
            if keyword.to_lowercase().contains(&query_lower) {
                return 40.0;
            }
        }

        if let Some(ref comment) = app.comment {
            if comment.to_lowercase().contains(&query_lower) {
                return 30.0;
            }
        }

        0.0
    }
}

impl SearchProvider for AppProvider {
    fn id(&self) -> &str {
        "apps"
    }

    fn search(&self, query: &str) -> Vec<SearchResult> {
        if query.trim().is_empty() {
            return vec![];
        }

        let apps = match self.apps.read() {
            Ok(lock) => lock,
            Err(_) => return vec![],
        };

        let mut results: Vec<SearchResult> = apps
            .iter()
            .filter_map(|app| {
                let score = Self::score_match(query, app);
                if score > 0.0 {
                    Some(SearchResult {
                        id: format!("app:{}", app.id),
                        title: app.name.clone(),
                        subtitle: app.generic_name.clone().or(app.comment.clone()),
                        icon: app
                            .icon
                            .clone()
                            .map(ResultIcon::Text)
                            .unwrap_or(ResultIcon::Emoji("📦".to_string())),
                        category: ResultCategory::Application,
                        score,
                    })
                } else {
                    None
                }
            })
            .collect();

        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
        results.truncate(10);
        results
    }

    fn execute(&self, result_id: &str) -> Result<(), String> {
        if let Some(desktop_path) = result_id.strip_prefix("app:") {
            let apps = self.apps.read().map_err(|e| e.to_string())?;
            if let Some(app) = apps.iter().find(|a| a.id == desktop_path) {
                std::process::Command::new("sh")
                    .arg("-c")
                    .arg(&app.exec)
                    .spawn()
                    .map_err(|e| e.to_string())?;
                Ok(())
            } else {
                Err("App not found".to_string())
            }
        } else {
            Err("Invalid app result".to_string())
        }
    }
}
