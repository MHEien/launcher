use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub author: Option<String>,
    pub description: Option<String>,
    pub permissions: Vec<PluginPermission>,
    pub entry: String,
    pub provides: PluginProvides,
    #[serde(default)]
    pub oauth: HashMap<String, OAuthConfig>,
    /// AI tool schemas - maps tool name to schema definition
    #[serde(default)]
    pub ai_tool_schemas: HashMap<String, AIToolSchema>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginProvides {
    #[serde(default)]
    pub providers: Vec<String>,
    #[serde(default)]
    pub actions: Vec<String>,
    #[serde(default)]
    pub ai_tools: Vec<String>,
}

/// JSON Schema for AI tool parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIToolSchema {
    /// Human-readable description of what the tool does
    pub description: String,
    /// JSON Schema for tool parameters
    pub parameters: AIToolParameters,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIToolParameters {
    #[serde(rename = "type")]
    pub param_type: String, // Should be "object"
    pub properties: HashMap<String, AIToolProperty>,
    #[serde(default)]
    pub required: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIToolProperty {
    #[serde(rename = "type")]
    pub prop_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "enum")]
    pub enum_values: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum PluginPermission {
    Network,
    #[serde(rename = "filesystem:read")]
    FilesystemRead,
    #[serde(rename = "filesystem:write")]
    FilesystemWrite,
    Clipboard,
    Notifications,
    #[serde(rename = "oauth")]
    OAuth(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthConfig {
    pub scopes: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct LoadedPlugin {
    pub manifest: PluginManifest,
    pub path: PathBuf,
    pub wasm_bytes: Vec<u8>,
    pub enabled: bool,
}

impl PluginManifest {
    pub fn from_file(path: &PathBuf) -> Result<Self, String> {
        let content =
            std::fs::read_to_string(path).map_err(|e| format!("Failed to read manifest: {}", e))?;

        serde_json::from_str(&content).map_err(|e| format!("Failed to parse manifest: {}", e))
    }

    pub fn has_permission(&self, permission: &PluginPermission) -> bool {
        self.permissions.contains(permission)
    }
}

impl Default for PluginProvides {
    fn default() -> Self {
        Self {
            providers: Vec::new(),
            actions: Vec::new(),
            ai_tools: Vec::new(),
        }
    }
}
