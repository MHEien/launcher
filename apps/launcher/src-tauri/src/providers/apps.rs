use super::{ResultCategory, ResultIcon, SearchProvider, SearchResult};

// Linux implementation using freedesktop desktop entries
#[cfg(target_os = "linux")]
mod linux {
    use super::*;
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
}

// Windows implementation - scans Start Menu shortcuts
#[cfg(target_os = "windows")]
mod windows {
    use super::*;
    use std::collections::HashMap;
    use std::path::PathBuf;
    use std::sync::RwLock;

    pub struct AppProvider {
        apps: RwLock<Vec<AppEntry>>,
    }

    #[derive(Debug, Clone)]
    struct AppEntry {
        id: String,
        name: String,
        path: PathBuf,
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

            // Common Start Menu locations
            let start_menu_paths = Self::get_start_menu_paths();

            for base_path in start_menu_paths {
                if base_path.exists() {
                    Self::scan_directory(&base_path, &mut apps, &mut seen);
                }
            }

            if let Ok(mut lock) = self.apps.write() {
                *lock = apps;
            }
        }

        fn get_start_menu_paths() -> Vec<PathBuf> {
            let mut paths = Vec::new();

            // User Start Menu
            if let Some(appdata) = std::env::var_os("APPDATA") {
                let user_start = PathBuf::from(appdata)
                    .join("Microsoft")
                    .join("Windows")
                    .join("Start Menu")
                    .join("Programs");
                paths.push(user_start);
            }

            // System Start Menu
            if let Some(programdata) = std::env::var_os("PROGRAMDATA") {
                let system_start = PathBuf::from(programdata)
                    .join("Microsoft")
                    .join("Windows")
                    .join("Start Menu")
                    .join("Programs");
                paths.push(system_start);
            }

            paths
        }

        fn scan_directory(dir: &PathBuf, apps: &mut Vec<AppEntry>, seen: &mut HashMap<String, bool>) {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();

                    if path.is_dir() {
                        Self::scan_directory(&path, apps, seen);
                    } else if let Some(ext) = path.extension() {
                        if ext == "lnk" {
                            if let Some(name) = path.file_stem() {
                                let name_str = name.to_string_lossy().to_string();

                                // Skip duplicates and common uninstallers
                                if seen.contains_key(&name_str)
                                    || name_str.to_lowercase().contains("uninstall")
                                {
                                    continue;
                                }
                                seen.insert(name_str.clone(), true);

                                apps.push(AppEntry {
                                    id: path.to_string_lossy().to_string(),
                                    name: name_str,
                                    path: path.clone(),
                                });
                            }
                        }
                    }
                }
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

            // Check individual words
            for word in name_lower.split_whitespace() {
                if word.starts_with(&query_lower) {
                    return 60.0;
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
                            subtitle: Some(app.path.to_string_lossy().to_string()),
                            icon: ResultIcon::Emoji("📦".to_string()),
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
            if let Some(shortcut_path) = result_id.strip_prefix("app:") {
                std::process::Command::new("cmd")
                    .args(["/C", "start", "", shortcut_path])
                    .spawn()
                    .map_err(|e| format!("Failed to launch app: {}", e))?;
                Ok(())
            } else {
                Err("Invalid app result".to_string())
            }
        }
    }
}

// macOS implementation - scans Applications folders
#[cfg(target_os = "macos")]
mod macos {
    use super::*;
    use std::collections::HashMap;
    use std::path::PathBuf;
    use std::sync::RwLock;

    pub struct AppProvider {
        apps: RwLock<Vec<AppEntry>>,
    }

    #[derive(Debug, Clone)]
    struct AppEntry {
        id: String,
        name: String,
        path: PathBuf,
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

            // Standard Applications directories
            let app_dirs = vec![
                PathBuf::from("/Applications"),
                PathBuf::from("/System/Applications"),
                dirs::home_dir()
                    .map(|h| h.join("Applications"))
                    .unwrap_or_default(),
            ];

            for dir in app_dirs {
                if dir.exists() {
                    Self::scan_directory(&dir, &mut apps, &mut seen, 0);
                }
            }

            if let Ok(mut lock) = self.apps.write() {
                *lock = apps;
            }
        }

        fn scan_directory(
            dir: &PathBuf,
            apps: &mut Vec<AppEntry>,
            seen: &mut HashMap<String, bool>,
            depth: u32,
        ) {
            // Limit recursion depth to avoid scanning inside .app bundles too deeply
            if depth > 2 {
                return;
            }

            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();

                    if let Some(ext) = path.extension() {
                        if ext == "app" {
                            if let Some(name) = path.file_stem() {
                                let name_str = name.to_string_lossy().to_string();

                                if seen.contains_key(&name_str) {
                                    continue;
                                }
                                seen.insert(name_str.clone(), true);

                                apps.push(AppEntry {
                                    id: path.to_string_lossy().to_string(),
                                    name: name_str,
                                    path: path.clone(),
                                });
                            }
                            // Don't recurse into .app bundles
                            continue;
                        }
                    }

                    // Recurse into subdirectories (but not .app bundles)
                    if path.is_dir() {
                        Self::scan_directory(&path, apps, seen, depth + 1);
                    }
                }
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

            // Check individual words
            for word in name_lower.split_whitespace() {
                if word.starts_with(&query_lower) {
                    return 60.0;
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
                            subtitle: Some(app.path.to_string_lossy().to_string()),
                            icon: ResultIcon::Emoji("📦".to_string()),
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
            if let Some(app_path) = result_id.strip_prefix("app:") {
                std::process::Command::new("open")
                    .arg(app_path)
                    .spawn()
                    .map_err(|e| format!("Failed to launch app: {}", e))?;
                Ok(())
            } else {
                Err("Invalid app result".to_string())
            }
        }
    }
}

#[cfg(target_os = "linux")]
pub use linux::AppProvider;

#[cfg(target_os = "windows")]
pub use windows::AppProvider;

#[cfg(target_os = "macos")]
pub use macos::AppProvider;
