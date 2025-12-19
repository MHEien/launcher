use crate::config::CONFIG;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::{Duration, SystemTime};

/// A plugin entry in the marketplace registry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryPlugin {
    pub id: String,
    pub name: String,
    pub version: String,
    pub author: Option<String>,
    pub description: Option<String>,
    pub icon_url: Option<String>,
    pub homepage: Option<String>,
    pub repository: Option<String>,
    pub download_url: String,
    pub checksum: Option<String>,
    pub permissions: Vec<String>,
    pub categories: Vec<String>,
    pub downloads: u64,
    pub rating: Option<f32>,
    pub verified: bool,
    pub featured: bool,
}

/// Response from the marketplace API list endpoint
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceResponse {
    pub plugins: Vec<RegistryPlugin>,
    pub total: u64,
    #[serde(rename = "hasMore")]
    pub has_more: bool,
    pub is_offline: bool,
    pub last_updated: Option<u64>, // Unix timestamp in seconds
}

/// Plugin data as returned by the server API
#[derive(Debug, Clone, Deserialize)]
struct ServerPluginResponse {
    id: String,
    name: String,
    description: Option<String>,
    #[serde(rename = "iconUrl")]
    icon_url: Option<String>,
    #[serde(rename = "authorName")]
    author_name: Option<String>,
    #[serde(rename = "currentVersion")]
    current_version: Option<String>,
    categories: Option<Vec<String>>,
    downloads: Option<u64>,
    #[serde(rename = "weeklyDownloads")]
    weekly_downloads: Option<u64>,
    rating: Option<f32>,
    #[serde(rename = "ratingCount")]
    rating_count: Option<u64>,
    verified: Option<bool>,
    featured: Option<bool>,
    homepage: Option<String>,
    repository: Option<String>,
    #[serde(rename = "publishedAt")]
    published_at: Option<String>,
    // Additional fields from PluginDetails (ignored if not present)
    #[serde(rename = "longDescription")]
    long_description: Option<String>,
    #[serde(rename = "bannerUrl")]
    banner_url: Option<String>,
    license: Option<String>,
    tags: Option<Vec<String>>,
    #[serde(rename = "authorId")]
    author_id: Option<String>,
    versions: Option<Vec<serde_json::Value>>, // We don't need to parse this
    permissions: Option<Vec<String>>,
    #[serde(rename = "aiToolSchemas")]
    ai_tool_schemas: Option<serde_json::Value>, // We don't need to parse this
    #[serde(rename = "createdAt")]
    created_at: Option<String>,
    #[serde(rename = "updatedAt")]
    updated_at: Option<String>,
}

/// Server API response
#[derive(Debug, Clone, Deserialize)]
struct ServerApiResponse {
    plugins: Vec<ServerPluginResponse>,
    total: u64,
    #[serde(rename = "hasMore")]
    has_more: bool,
}

/// Plugin registry for marketplace
pub struct PluginRegistry {
    cache_dir: PathBuf,
    plugins: RwLock<HashMap<String, RegistryPlugin>>,
    last_updated: RwLock<Option<SystemTime>>,
    is_offline: RwLock<bool>,
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
            is_offline: RwLock::new(false),
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

        *self.last_updated.write() = Some(SystemTime::now());

        Ok(())
    }

    /// Fetch plugins from the server API
    pub async fn fetch_from_server(&self) -> Result<(), String> {
        let api_url = CONFIG.plugins_api_url();
        // Fetch all plugins with a high limit
        let url = format!("{}?limit=100", api_url);

        eprintln!("Fetching plugins from: {}", url);

        let client = reqwest::Client::new();
        let response = client
            .get(&url)
            .timeout(Duration::from_secs(10))
            .send()
            .await
            .map_err(|e| {
                *self.is_offline.write() = true;
                format!("Failed to fetch plugins: {}", e)
            })?;

        if !response.status().is_success() {
            *self.is_offline.write() = true;
            return Err(format!("Plugin API returned status: {}", response.status()));
        }

        let api_response: ServerApiResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse plugin response: {}", e))?;

        // Convert server plugins to registry format
        let mut registry = self.plugins.write();
        registry.clear();

        for server_plugin in api_response.plugins {
            let plugin = self.convert_server_plugin(server_plugin);
            registry.insert(plugin.id.clone(), plugin);
        }
        drop(registry);

        // Mark as online and update timestamp
        *self.is_offline.write() = false;
        *self.last_updated.write() = Some(SystemTime::now());

        // Save to cache
        self.save_cache()?;

        eprintln!("Successfully fetched {} plugins", api_response.total);
        Ok(())
    }

    /// Fetch a single plugin by ID from the server API
    pub async fn fetch_plugin_by_id(&self, id: &str) -> Result<RegistryPlugin, String> {
        let api_url = CONFIG.plugins_api_url();
        let url = format!("{}/{}", api_url, id);

        eprintln!("Fetching plugin from: {}", url);

        let client = reqwest::Client::new();
        let response = client
            .get(&url)
            .timeout(Duration::from_secs(10))
            .send()
            .await
            .map_err(|e| format!("Failed to fetch plugin: {}", e))?;

        if !response.status().is_success() {
            if response.status() == 404 {
                return Err(format!("Plugin not found: {}", id));
            }
            return Err(format!("Plugin API returned status: {}", response.status()));
        }

        let server_plugin: ServerPluginResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse plugin response: {}", e))?;

        let plugin = self.convert_server_plugin(server_plugin);

        // Add to registry cache
        self.plugins.write().insert(plugin.id.clone(), plugin.clone());

        // Save to cache
        self.save_cache()?;

        Ok(plugin)
    }

    /// Convert a server plugin response to our RegistryPlugin format
    fn convert_server_plugin(&self, server: ServerPluginResponse) -> RegistryPlugin {
        // Build download URL from API
        let download_url = format!("{}/{}/download", CONFIG.plugins_api_url(), server.id);

        RegistryPlugin {
            id: server.id,
            name: server.name,
            version: server
                .current_version
                .unwrap_or_else(|| "0.0.0".to_string()),
            author: server.author_name,
            description: server.description,
            icon_url: server.icon_url,
            homepage: server.homepage,
            repository: server.repository,
            download_url,
            checksum: None,      // Checksum is fetched during download
            permissions: server.permissions.unwrap_or_default(), // Use permissions from API if available
            categories: server.categories.unwrap_or_default(),
            downloads: server.downloads.unwrap_or(0),
            rating: server.rating,
            verified: server.verified.unwrap_or(false),
            featured: server.featured.unwrap_or(false),
        }
    }

    /// List all plugins in registry with status
    pub fn list_plugins_with_status(&self) -> MarketplaceResponse {
        let plugins: Vec<RegistryPlugin> = self.plugins.read().values().cloned().collect();
        let total = plugins.len() as u64;
        let is_offline = *self.is_offline.read();
        let last_updated = self.last_updated.read().map(|t| {
            t.duration_since(SystemTime::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0)
        });

        MarketplaceResponse {
            plugins,
            total,
            has_more: false,
            is_offline,
            last_updated,
        }
    }

    /// List all plugins in registry (legacy method for compatibility)
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

    /// Check if the registry is offline
    pub fn is_offline(&self) -> bool {
        *self.is_offline.read()
    }

    /// Get the last update timestamp
    pub fn last_updated(&self) -> Option<SystemTime> {
        *self.last_updated.read()
    }

    /// Check if cache is stale (older than 1 hour)
    pub fn is_cache_stale(&self) -> bool {
        match *self.last_updated.read() {
            Some(time) => {
                let elapsed = SystemTime::now().duration_since(time).unwrap_or_default();
                elapsed > Duration::from_secs(3600) // 1 hour
            }
            None => true,
        }
    }
}
