use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

/// Filesystem permissions for a plugin
#[derive(Debug, Clone, Default)]
pub struct PluginFsPermissions {
    pub can_read: bool,
    pub can_write: bool,
    pub data_dir: PathBuf,
}

/// Search result returned by plugins
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginSearchResult {
    pub id: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub icon: Option<String>,
    pub score: Option<f32>,
    pub category: Option<String>,
    pub action: Option<PluginAction>,
}

/// Action that can be executed when a result is selected
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum PluginAction {
    #[serde(rename = "open_url")]
    OpenUrl(String),
    #[serde(rename = "copy")]
    Copy(String),
    #[serde(rename = "run_command")]
    RunCommand(String),
    #[serde(rename = "custom")]
    Custom(String),
}

/// HTTP request structure for plugins
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequest {
    pub url: String,
    pub method: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
}

/// HTTP response structure for plugins
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
}

/// Plugin configuration storage
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginConfig {
    pub values: HashMap<String, serde_json::Value>,
}

/// Log levels for plugin logging
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

/// Log message from plugin
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogMessage {
    pub level: LogLevel,
    pub message: String,
}

/// Host API trait defining all functions available to plugins
/// Note: With Extism, host functions are registered differently
/// This trait serves as documentation and for testing
pub trait PluginHostApi: Send + Sync {
    fn log(&self, plugin_id: &str, level: &str, message: &str);
    fn http_request(&self, plugin_id: &str, request: HttpRequest) -> Result<HttpResponse, String>;
    fn read_file(&self, plugin_id: &str, path: &str) -> Result<Vec<u8>, String>;
    fn write_file(&self, plugin_id: &str, path: &str, data: &[u8]) -> Result<(), String>;
    fn get_config(&self, plugin_id: &str) -> PluginConfig;
    fn set_config(&self, plugin_id: &str, config: PluginConfig) -> Result<(), String>;
    fn show_notification(&self, plugin_id: &str, title: &str, body: &str) -> Result<(), String>;
    fn get_oauth_token(&self, plugin_id: &str, provider: &str) -> Result<String, String>;
}

/// Default implementation of the host API
pub struct DefaultHostApi {
    config_dir: PathBuf,
    plugins_data_dir: PathBuf,
    plugin_permissions: parking_lot::RwLock<HashMap<String, PluginFsPermissions>>,
}

impl DefaultHostApi {
    pub fn new() -> Self {
        let base_dir = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("launcher");

        let config_dir = base_dir.join("plugin_configs");
        let plugins_data_dir = base_dir.join("plugin_data");

        let _ = std::fs::create_dir_all(&config_dir);
        let _ = std::fs::create_dir_all(&plugins_data_dir);

        Self {
            config_dir,
            plugins_data_dir,
            plugin_permissions: parking_lot::RwLock::new(HashMap::new()),
        }
    }

    /// Register a plugin with its filesystem permissions
    pub fn register_plugin(&self, plugin_id: &str, can_read: bool, can_write: bool) {
        let data_dir = self.plugins_data_dir.join(plugin_id);
        let _ = std::fs::create_dir_all(&data_dir);

        let mut permissions = self.plugin_permissions.write();
        permissions.insert(
            plugin_id.to_string(),
            PluginFsPermissions {
                can_read,
                can_write,
                data_dir,
            },
        );
    }

    /// Unregister a plugin (when unloaded)
    pub fn unregister_plugin(&self, plugin_id: &str) {
        let mut permissions = self.plugin_permissions.write();
        permissions.remove(plugin_id);
    }

    fn get_config_path(&self, plugin_id: &str) -> PathBuf {
        self.config_dir.join(format!("{}.json", plugin_id))
    }

    /// Get the sandboxed data directory for a plugin
    pub fn get_plugin_data_dir(&self, plugin_id: &str) -> PathBuf {
        self.plugins_data_dir.join(plugin_id)
    }

    /// Resolve and validate a path for filesystem operations
    /// Returns the canonical path if valid, or an error
    fn resolve_sandboxed_path(&self, plugin_id: &str, path: &str) -> Result<PathBuf, String> {
        let permissions = self.plugin_permissions.read();
        let perms = permissions
            .get(plugin_id)
            .ok_or_else(|| format!("Plugin '{}' not registered", plugin_id))?;

        // Parse the path
        let requested_path = Path::new(path);

        // Determine the actual path to use
        let resolved_path = if requested_path.is_absolute() {
            // Absolute paths are NOT allowed - must use relative paths within data dir
            return Err(format!(
                "Absolute paths not allowed. Use relative paths within your plugin's data directory."
            ));
        } else {
            // Relative path - resolve within the plugin's data directory
            perms.data_dir.join(requested_path)
        };

        // Canonicalize the data directory for comparison
        let canonical_data_dir = perms
            .data_dir
            .canonicalize()
            .unwrap_or_else(|_| perms.data_dir.clone());

        // For new files that don't exist yet, we need to check the parent
        let path_to_check = if resolved_path.exists() {
            resolved_path
                .canonicalize()
                .map_err(|e| format!("Failed to resolve path: {}", e))?
        } else {
            // For non-existent files, canonicalize the parent and append the filename
            let parent = resolved_path
                .parent()
                .ok_or_else(|| "Invalid path: no parent directory".to_string())?;

            // Create parent directories if needed (for write operations)
            if !parent.exists() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create directory: {}", e))?;
            }

            let canonical_parent = parent
                .canonicalize()
                .map_err(|e| format!("Failed to resolve parent path: {}", e))?;

            let file_name = resolved_path
                .file_name()
                .ok_or_else(|| "Invalid path: no filename".to_string())?;

            canonical_parent.join(file_name)
        };

        // Security check: ensure the resolved path is within the plugin's data directory
        if !path_to_check.starts_with(&canonical_data_dir) {
            return Err(format!(
                "Path traversal denied. Access restricted to plugin data directory."
            ));
        }

        Ok(path_to_check)
    }
}

impl PluginHostApi for DefaultHostApi {
    fn log(&self, plugin_id: &str, level: &str, message: &str) {
        println!(
            "[Plugin:{}] [{}] {}",
            plugin_id,
            level.to_uppercase(),
            message
        );
    }

    fn http_request(&self, plugin_id: &str, request: HttpRequest) -> Result<HttpResponse, String> {
        // Use blocking reqwest for simplicity in host functions
        let client = reqwest::blocking::Client::new();

        let mut req_builder = match request.method.to_uppercase().as_str() {
            "GET" => client.get(&request.url),
            "POST" => client.post(&request.url),
            "PUT" => client.put(&request.url),
            "DELETE" => client.delete(&request.url),
            "PATCH" => client.patch(&request.url),
            _ => return Err(format!("Unsupported HTTP method: {}", request.method)),
        };

        for (key, value) in &request.headers {
            req_builder = req_builder.header(key, value);
        }

        if let Some(body) = request.body {
            req_builder = req_builder.body(body);
        }

        let response = req_builder
            .send()
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        let status = response.status().as_u16();
        let headers: HashMap<String, String> = response
            .headers()
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
            .collect();
        let body = response
            .text()
            .map_err(|e| format!("Failed to read response body: {}", e))?;

        println!(
            "[Plugin:{}] HTTP {} {} -> {}",
            plugin_id, request.method, request.url, status
        );

        Ok(HttpResponse {
            status,
            headers,
            body,
        })
    }

    fn read_file(&self, plugin_id: &str, path: &str) -> Result<Vec<u8>, String> {
        // Check if plugin has read permission
        {
            let permissions = self.plugin_permissions.read();
            let perms = permissions
                .get(plugin_id)
                .ok_or_else(|| format!("Plugin '{}' not registered", plugin_id))?;

            if !perms.can_read {
                return Err(format!(
                    "Plugin '{}' does not have filesystem:read permission",
                    plugin_id
                ));
            }
        }

        // Resolve and validate the path within the sandbox
        let resolved_path = self.resolve_sandboxed_path(plugin_id, path)?;

        println!(
            "[Plugin:{}] Reading file: {} -> {}",
            plugin_id,
            path,
            resolved_path.display()
        );
        std::fs::read(&resolved_path).map_err(|e| format!("Failed to read file: {}", e))
    }

    fn write_file(&self, plugin_id: &str, path: &str, data: &[u8]) -> Result<(), String> {
        // Check if plugin has write permission
        {
            let permissions = self.plugin_permissions.read();
            let perms = permissions
                .get(plugin_id)
                .ok_or_else(|| format!("Plugin '{}' not registered", plugin_id))?;

            if !perms.can_write {
                return Err(format!(
                    "Plugin '{}' does not have filesystem:write permission",
                    plugin_id
                ));
            }
        }

        // Resolve and validate the path within the sandbox
        let resolved_path = self.resolve_sandboxed_path(plugin_id, path)?;

        println!(
            "[Plugin:{}] Writing file: {} -> {}",
            plugin_id,
            path,
            resolved_path.display()
        );
        std::fs::write(&resolved_path, data).map_err(|e| format!("Failed to write file: {}", e))
    }

    fn get_config(&self, plugin_id: &str) -> PluginConfig {
        let path = self.get_config_path(plugin_id);
        if let Ok(content) = std::fs::read_to_string(&path) {
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            PluginConfig::default()
        }
    }

    fn set_config(&self, plugin_id: &str, config: PluginConfig) -> Result<(), String> {
        let path = self.get_config_path(plugin_id);
        let json = serde_json::to_string_pretty(&config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;
        std::fs::write(&path, json).map_err(|e| format!("Failed to write config: {}", e))
    }

    fn show_notification(&self, plugin_id: &str, title: &str, body: &str) -> Result<(), String> {
        // TODO: Implement actual system notifications
        println!("[Notification from {}] {}: {}", plugin_id, title, body);
        Ok(())
    }

    fn get_oauth_token(&self, plugin_id: &str, provider: &str) -> Result<String, String> {
        // TODO: Integrate with OAuth flow
        println!(
            "[Plugin:{}] Requesting OAuth token for: {}",
            plugin_id, provider
        );
        Err(format!(
            "OAuth token retrieval not yet implemented for provider: {}",
            provider
        ))
    }
}

// Global host API instance for use with Extism host functions
lazy_static::lazy_static! {
    pub static ref HOST_API: DefaultHostApi = DefaultHostApi::new();
}
