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

/// Command trigger that plugins can register (e.g., "git:", "docker:", "jira:")
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginCommand {
    /// The trigger prefix (without colon), e.g., "git", "docker", "jira"
    pub trigger: String,
    /// Display name for the command, e.g., "Git Commands"
    pub name: String,
    /// Description of what the command does
    #[serde(default)]
    pub description: String,
    /// Icon (emoji or icon name)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginProvides {
    #[serde(default)]
    pub providers: Vec<String>,
    #[serde(default)]
    pub actions: Vec<String>,
    #[serde(default)]
    pub ai_tools: Vec<String>,
    #[serde(default)]
    pub widgets: Vec<WidgetDefinition>,
    /// Command triggers that this plugin provides
    #[serde(default)]
    pub commands: Vec<PluginCommand>,
}

/// Widget definition for dashboard widgets provided by plugins
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetDefinition {
    /// Unique widget ID within the plugin
    pub id: String,
    /// Display name of the widget
    pub name: String,
    /// Short description of what the widget does
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Supported sizes for this widget
    #[serde(default = "default_widget_sizes")]
    pub sizes: Vec<String>,
    /// Refresh interval in seconds (0 for no auto-refresh)
    #[serde(default)]
    pub refresh_interval: u32,
    /// Widget category for organization
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
}

fn default_widget_sizes() -> Vec<String> {
    vec!["1x1".to_string(), "2x1".to_string()]
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
            widgets: Vec::new(),
            commands: Vec::new(),
        }
    }
}
