use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginSearchResult {
    pub id: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequest {
    pub url: String,
    pub method: String,
    pub headers: Vec<(String, String)>,
    pub body: Option<Vec<u8>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginConfig {
    pub values: std::collections::HashMap<String, serde_json::Value>,
}

impl Default for PluginConfig {
    fn default() -> Self {
        Self {
            values: std::collections::HashMap::new(),
        }
    }
}

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

pub struct DefaultHostApi {
    config_dir: std::path::PathBuf,
}

impl DefaultHostApi {
    pub fn new() -> Self {
        let config_dir = dirs::data_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("launcher")
            .join("plugin_configs");

        let _ = std::fs::create_dir_all(&config_dir);

        Self { config_dir }
    }

    fn get_config_path(&self, plugin_id: &str) -> std::path::PathBuf {
        self.config_dir.join(format!("{}.json", plugin_id))
    }
}

impl PluginHostApi for DefaultHostApi {
    fn log(&self, plugin_id: &str, level: &str, message: &str) {
        println!("[Plugin:{}] [{}] {}", plugin_id, level, message);
    }

    fn http_request(&self, _plugin_id: &str, request: HttpRequest) -> Result<HttpResponse, String> {
        Err(format!(
            "HTTP requests not yet implemented: {} {}",
            request.method, request.url
        ))
    }

    fn read_file(&self, _plugin_id: &str, path: &str) -> Result<Vec<u8>, String> {
        std::fs::read(path).map_err(|e| format!("Failed to read file: {}", e))
    }

    fn write_file(&self, _plugin_id: &str, path: &str, data: &[u8]) -> Result<(), String> {
        std::fs::write(path, data).map_err(|e| format!("Failed to write file: {}", e))
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
        println!("[Notification from {}] {}: {}", plugin_id, title, body);
        Ok(())
    }

    fn get_oauth_token(&self, _plugin_id: &str, provider: &str) -> Result<String, String> {
        Err(format!("OAuth not yet implemented for provider: {}", provider))
    }
}
