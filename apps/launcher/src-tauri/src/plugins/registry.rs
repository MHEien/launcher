use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// A plugin entry in the marketplace registry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryPlugin {
    pub id: String,
    pub name: String,
    pub version: String,
    pub author: Option<String>,
    pub description: Option<String>,
    pub homepage: Option<String>,
    pub repository: Option<String>,
    pub download_url: String,
    pub checksum: Option<String>,
    pub permissions: Vec<String>,
    pub categories: Vec<String>,
    pub downloads: u64,
    pub rating: Option<f32>,
}

/// Plugin registry for marketplace
pub struct PluginRegistry {
    cache_dir: PathBuf,
    plugins: RwLock<HashMap<String, RegistryPlugin>>,
    last_updated: RwLock<Option<std::time::SystemTime>>,
}

impl PluginRegistry {
    pub fn new() -> Self {
        let cache_dir = dirs::cache_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("launcher")
            .join("registry");

        Self {
            cache_dir,
            plugins: RwLock::new(HashMap::new()),
            last_updated: RwLock::new(None),
        }
    }

    /// Load registry from local cache
    pub fn load_cache(&self) -> Result<(), String> {
        let cache_file = self.cache_dir.join("plugins.json");
        if !cache_file.exists() {
            return Ok(());
        }

        let contents = std::fs::read_to_string(&cache_file)
            .map_err(|e| format!("Failed to read registry cache: {}", e))?;

        let plugins: Vec<RegistryPlugin> = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse registry cache: {}", e))?;

        let mut registry = self.plugins.write();
        for plugin in plugins {
            registry.insert(plugin.id.clone(), plugin);
        }

        if let Ok(metadata) = std::fs::metadata(&cache_file) {
            if let Ok(modified) = metadata.modified() {
                *self.last_updated.write() = Some(modified);
            }
        }

        Ok(())
    }

    /// Save registry to local cache
    pub fn save_cache(&self) -> Result<(), String> {
        std::fs::create_dir_all(&self.cache_dir)
            .map_err(|e| format!("Failed to create cache directory: {}", e))?;

        let plugins: Vec<RegistryPlugin> = self.plugins.read().values().cloned().collect();
        let contents = serde_json::to_string_pretty(&plugins)
            .map_err(|e| format!("Failed to serialize registry: {}", e))?;

        let cache_file = self.cache_dir.join("plugins.json");
        std::fs::write(&cache_file, contents)
            .map_err(|e| format!("Failed to write registry cache: {}", e))?;

        *self.last_updated.write() = Some(std::time::SystemTime::now());

        Ok(())
    }

    /// Fetch registry from remote URL
    pub async fn fetch_remote(&self, url: &str) -> Result<(), String> {
        let response = reqwest::get(url)
            .await
            .map_err(|e| format!("Failed to fetch registry: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Registry fetch failed with status: {}",
                response.status()
            ));
        }

        let plugins: Vec<RegistryPlugin> = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse registry response: {}", e))?;

        let mut registry = self.plugins.write();
        registry.clear();
        for plugin in plugins {
            registry.insert(plugin.id.clone(), plugin);
        }
        drop(registry);

        self.save_cache()?;

        Ok(())
    }

    /// List all plugins in registry
    pub fn list_plugins(&self) -> Vec<RegistryPlugin> {
        self.plugins.read().values().cloned().collect()
    }

    /// Search plugins by query
    pub fn search(&self, query: &str) -> Vec<RegistryPlugin> {
        let query_lower = query.to_lowercase();
        self.plugins
            .read()
            .values()
            .filter(|p| {
                p.name.to_lowercase().contains(&query_lower)
                    || p.description
                        .as_ref()
                        .map(|d| d.to_lowercase().contains(&query_lower))
                        .unwrap_or(false)
                    || p.categories
                        .iter()
                        .any(|c| c.to_lowercase().contains(&query_lower))
            })
            .cloned()
            .collect()
    }

    /// Get a specific plugin by ID
    pub fn get_plugin(&self, id: &str) -> Option<RegistryPlugin> {
        self.plugins.read().get(id).cloned()
    }

    /// Filter plugins by category
    pub fn by_category(&self, category: &str) -> Vec<RegistryPlugin> {
        let category_lower = category.to_lowercase();
        self.plugins
            .read()
            .values()
            .filter(|p| {
                p.categories
                    .iter()
                    .any(|c| c.to_lowercase() == category_lower)
            })
            .cloned()
            .collect()
    }

    /// Get all unique categories
    pub fn categories(&self) -> Vec<String> {
        let mut categories: Vec<String> = self
            .plugins
            .read()
            .values()
            .flat_map(|p| p.categories.clone())
            .collect();
        categories.sort();
        categories.dedup();
        categories
    }

    /// Add a plugin to the registry (for local/dev plugins)
    pub fn add_plugin(&self, plugin: RegistryPlugin) {
        self.plugins.write().insert(plugin.id.clone(), plugin);
    }

    /// Load built-in/featured plugins (hardcoded for now, can be remote later)
    pub fn load_featured(&self) {
        let featured = vec![
            RegistryPlugin {
                id: "hello-plugin".to_string(),
                name: "Hello Plugin".to_string(),
                version: "1.0.0".to_string(),
                author: Some("Launcher Team".to_string()),
                description: Some("A simple example plugin that demonstrates the plugin API".to_string()),
                homepage: None,
                repository: Some("https://github.com/launcher/hello-plugin".to_string()),
                download_url: "local://examples/hello-plugin".to_string(),
                checksum: None,
                permissions: vec!["logging".to_string()],
                categories: vec!["Examples".to_string(), "Development".to_string()],
                downloads: 0,
                rating: None,
            },
            RegistryPlugin {
                id: "clipboard-history".to_string(),
                name: "Clipboard History".to_string(),
                version: "1.0.0".to_string(),
                author: Some("Launcher Team".to_string()),
                description: Some("Track and search your clipboard history. Access past copies with a simple search.".to_string()),
                homepage: None,
                repository: None,
                download_url: "https://plugins.launcher.dev/clipboard-history/1.0.0.zip".to_string(),
                checksum: None,
                permissions: vec!["clipboard".to_string()],
                categories: vec!["Productivity".to_string(), "Utilities".to_string()],
                downloads: 1250,
                rating: Some(4.5),
            },
            RegistryPlugin {
                id: "snippets".to_string(),
                name: "Snippets".to_string(),
                version: "1.0.0".to_string(),
                author: Some("Launcher Team".to_string()),
                description: Some("Create and manage text snippets. Quickly insert frequently used text.".to_string()),
                homepage: None,
                repository: None,
                download_url: "https://plugins.launcher.dev/snippets/1.0.0.zip".to_string(),
                checksum: None,
                permissions: vec!["clipboard".to_string(), "filesystem:read".to_string()],
                categories: vec!["Productivity".to_string(), "Text".to_string()],
                downloads: 890,
                rating: Some(4.2),
            },
            RegistryPlugin {
                id: "emoji-picker".to_string(),
                name: "Emoji Picker".to_string(),
                version: "1.0.0".to_string(),
                author: Some("Community".to_string()),
                description: Some("Search and insert emojis quickly. Supports skin tone modifiers.".to_string()),
                homepage: None,
                repository: None,
                download_url: "https://plugins.launcher.dev/emoji-picker/1.0.0.zip".to_string(),
                checksum: None,
                permissions: vec!["clipboard".to_string()],
                categories: vec!["Utilities".to_string(), "Fun".to_string()],
                downloads: 2100,
                rating: Some(4.8),
            },
            RegistryPlugin {
                id: "color-picker".to_string(),
                name: "Color Picker".to_string(),
                version: "1.0.0".to_string(),
                author: Some("Community".to_string()),
                description: Some("Pick colors from screen, convert between formats (HEX, RGB, HSL).".to_string()),
                homepage: None,
                repository: None,
                download_url: "https://plugins.launcher.dev/color-picker/1.0.0.zip".to_string(),
                checksum: None,
                permissions: vec!["clipboard".to_string()],
                categories: vec!["Design".to_string(), "Development".to_string()],
                downloads: 1560,
                rating: Some(4.6),
            },
            RegistryPlugin {
                id: "linear".to_string(),
                name: "Linear".to_string(),
                version: "1.0.0".to_string(),
                author: Some("Community".to_string()),
                description: Some("Search and create Linear issues. View assigned tasks and project status.".to_string()),
                homepage: Some("https://linear.app".to_string()),
                repository: None,
                download_url: "https://plugins.launcher.dev/linear/1.0.0.zip".to_string(),
                checksum: None,
                permissions: vec!["network".to_string(), "oauth:linear".to_string()],
                categories: vec!["Productivity".to_string(), "Development".to_string(), "Project Management".to_string()],
                downloads: 3200,
                rating: Some(4.7),
            },
            RegistryPlugin {
                id: "jira".to_string(),
                name: "Jira".to_string(),
                version: "1.0.0".to_string(),
                author: Some("Community".to_string()),
                description: Some("Search Jira issues, view sprint boards, and create new tickets.".to_string()),
                homepage: Some("https://www.atlassian.com/software/jira".to_string()),
                repository: None,
                download_url: "https://plugins.launcher.dev/jira/1.0.0.zip".to_string(),
                checksum: None,
                permissions: vec!["network".to_string(), "oauth:jira".to_string()],
                categories: vec!["Productivity".to_string(), "Development".to_string(), "Project Management".to_string()],
                downloads: 4500,
                rating: Some(4.3),
            },
            RegistryPlugin {
                id: "todoist".to_string(),
                name: "Todoist".to_string(),
                version: "1.0.0".to_string(),
                author: Some("Community".to_string()),
                description: Some("Manage Todoist tasks. Add, complete, and search your to-dos.".to_string()),
                homepage: Some("https://todoist.com".to_string()),
                repository: None,
                download_url: "https://plugins.launcher.dev/todoist/1.0.0.zip".to_string(),
                checksum: None,
                permissions: vec!["network".to_string(), "oauth:todoist".to_string()],
                categories: vec!["Productivity".to_string(), "Tasks".to_string()],
                downloads: 2800,
                rating: Some(4.6),
            },
            RegistryPlugin {
                id: "things".to_string(),
                name: "Things 3".to_string(),
                version: "1.0.0".to_string(),
                author: Some("Community".to_string()),
                description: Some("Quick add tasks to Things 3. Search and complete your to-dos. (macOS only)".to_string()),
                homepage: Some("https://culturedcode.com/things/".to_string()),
                repository: None,
                download_url: "https://plugins.launcher.dev/things/1.0.0.zip".to_string(),
                checksum: None,
                permissions: vec!["applescript".to_string()],
                categories: vec!["Productivity".to_string(), "Tasks".to_string()],
                downloads: 1200,
                rating: Some(4.8),
            },
            RegistryPlugin {
                id: "1password".to_string(),
                name: "1Password".to_string(),
                version: "1.0.0".to_string(),
                author: Some("Community".to_string()),
                description: Some("Search and copy passwords from 1Password. Requires 1Password CLI.".to_string()),
                homepage: Some("https://1password.com".to_string()),
                repository: None,
                download_url: "https://plugins.launcher.dev/1password/1.0.0.zip".to_string(),
                checksum: None,
                permissions: vec!["clipboard".to_string(), "shell:op".to_string()],
                categories: vec!["Security".to_string(), "Utilities".to_string()],
                downloads: 5600,
                rating: Some(4.9),
            },
            RegistryPlugin {
                id: "bitwarden".to_string(),
                name: "Bitwarden".to_string(),
                version: "1.0.0".to_string(),
                author: Some("Community".to_string()),
                description: Some("Search and copy passwords from Bitwarden vault.".to_string()),
                homepage: Some("https://bitwarden.com".to_string()),
                repository: None,
                download_url: "https://plugins.launcher.dev/bitwarden/1.0.0.zip".to_string(),
                checksum: None,
                permissions: vec!["clipboard".to_string(), "shell:bw".to_string()],
                categories: vec!["Security".to_string(), "Utilities".to_string()],
                downloads: 3400,
                rating: Some(4.5),
            },
            RegistryPlugin {
                id: "spotify".to_string(),
                name: "Spotify".to_string(),
                version: "1.0.0".to_string(),
                author: Some("Community".to_string()),
                description: Some("Control Spotify playback. Search tracks, albums, and playlists.".to_string()),
                homepage: Some("https://spotify.com".to_string()),
                repository: None,
                download_url: "https://plugins.launcher.dev/spotify/1.0.0.zip".to_string(),
                checksum: None,
                permissions: vec!["network".to_string(), "oauth:spotify".to_string()],
                categories: vec!["Media".to_string(), "Music".to_string()],
                downloads: 6200,
                rating: Some(4.7),
            },
            RegistryPlugin {
                id: "docker".to_string(),
                name: "Docker".to_string(),
                version: "1.0.0".to_string(),
                author: Some("Community".to_string()),
                description: Some("Manage Docker containers. Start, stop, and view logs.".to_string()),
                homepage: None,
                repository: None,
                download_url: "https://plugins.launcher.dev/docker/1.0.0.zip".to_string(),
                checksum: None,
                permissions: vec!["shell:docker".to_string()],
                categories: vec!["Development".to_string(), "DevOps".to_string()],
                downloads: 2100,
                rating: Some(4.4),
            },
            RegistryPlugin {
                id: "ssh".to_string(),
                name: "SSH Connections".to_string(),
                version: "1.0.0".to_string(),
                author: Some("Community".to_string()),
                description: Some("Quick connect to SSH hosts from ~/.ssh/config.".to_string()),
                homepage: None,
                repository: None,
                download_url: "https://plugins.launcher.dev/ssh/1.0.0.zip".to_string(),
                checksum: None,
                permissions: vec!["filesystem:read".to_string(), "shell:ssh".to_string()],
                categories: vec!["Development".to_string(), "DevOps".to_string(), "Utilities".to_string()],
                downloads: 1800,
                rating: Some(4.3),
            },
        ];

        let mut registry = self.plugins.write();
        for plugin in featured {
            registry.insert(plugin.id.clone(), plugin);
        }
    }
}
