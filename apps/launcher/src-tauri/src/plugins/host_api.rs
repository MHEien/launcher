use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
        // TODO: Add path validation/sandboxing based on permissions
        println!("[Plugin:{}] Reading file: {}", plugin_id, path);
        std::fs::read(path).map_err(|e| format!("Failed to read file: {}", e))
    }

    fn write_file(&self, plugin_id: &str, path: &str, data: &[u8]) -> Result<(), String> {
        // TODO: Add path validation/sandboxing based on permissions
        println!("[Plugin:{}] Writing file: {}", plugin_id, path);
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
