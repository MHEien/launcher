//! Core types for Launcher plugins

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A search result returned by a plugin
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    /// Unique identifier for this result
    pub id: String,
    /// Primary display text
    pub title: String,
    /// Secondary display text
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subtitle: Option<String>,
    /// Icon URL, emoji, or icon name
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    /// Relevance score (higher = more relevant)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score: Option<f32>,
    /// Category for grouping results
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    /// Action to execute when selected
    #[serde(skip_serializing_if = "Option::is_none")]
    pub action: Option<PluginAction>,
}

impl SearchResult {
    /// Create a new search result with the given ID and title
    pub fn new(id: impl Into<String>, title: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            title: title.into(),
            subtitle: None,
            icon: None,
            score: None,
            category: None,
            action: None,
        }
    }

    /// Add a subtitle to the result
    pub fn with_subtitle(mut self, subtitle: impl Into<String>) -> Self {
        self.subtitle = Some(subtitle.into());
        self
    }

    /// Add an icon to the result
    pub fn with_icon(mut self, icon: impl Into<String>) -> Self {
        self.icon = Some(icon.into());
        self
    }

    /// Set the relevance score
    pub fn with_score(mut self, score: f32) -> Self {
        self.score = Some(score);
        self
    }

    /// Set the category
    pub fn with_category(mut self, category: impl Into<String>) -> Self {
        self.category = Some(category.into());
        self
    }

    /// Set the action to open a URL
    pub fn with_open_url(mut self, url: impl Into<String>) -> Self {
        self.action = Some(PluginAction::OpenUrl(url.into()));
        self
    }

    /// Set the action to copy text
    pub fn with_copy(mut self, text: impl Into<String>) -> Self {
        self.action = Some(PluginAction::Copy(text.into()));
        self
    }

    /// Set the action to run a command
    pub fn with_command(mut self, command: impl Into<String>) -> Self {
        self.action = Some(PluginAction::RunCommand(command.into()));
        self
    }

    /// Set a custom action
    pub fn with_custom_action(mut self, action: impl Into<String>) -> Self {
        self.action = Some(PluginAction::Custom(action.into()));
        self
    }
}

/// Action to execute when a search result is selected
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum PluginAction {
    /// Open a URL in the default browser
    #[serde(rename = "open_url")]
    OpenUrl(String),
    /// Copy text to clipboard
    #[serde(rename = "copy")]
    Copy(String),
    /// Run a shell command
    #[serde(rename = "run_command")]
    RunCommand(String),
    /// Custom action (plugin-specific)
    #[serde(rename = "custom")]
    Custom(String),
}

/// Input provided to the search function
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchInput {
    /// The search query
    pub query: String,
}

/// Output returned from the search function
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchOutput {
    /// The search results
    pub results: Vec<SearchResult>,
}

impl SearchOutput {
    /// Create a new search output with the given results
    pub fn new(results: Vec<SearchResult>) -> Self {
        Self { results }
    }

    /// Create an empty search output
    pub fn empty() -> Self {
        Self { results: vec![] }
    }
}

/// HTTP request configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequest {
    /// The URL to request
    pub url: String,
    /// HTTP method (GET, POST, PUT, DELETE, PATCH)
    pub method: String,
    /// Request headers
    #[serde(default)]
    pub headers: HashMap<String, String>,
    /// Request body (for POST, PUT, PATCH)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
}

impl HttpRequest {
    /// Create a GET request
    pub fn get(url: impl Into<String>) -> Self {
        Self {
            url: url.into(),
            method: "GET".to_string(),
            headers: HashMap::new(),
            body: None,
        }
    }

    /// Create a POST request
    pub fn post(url: impl Into<String>) -> Self {
        Self {
            url: url.into(),
            method: "POST".to_string(),
            headers: HashMap::new(),
            body: None,
        }
    }

    /// Add a header
    pub fn with_header(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.headers.insert(key.into(), value.into());
        self
    }

    /// Set the request body
    pub fn with_body(mut self, body: impl Into<String>) -> Self {
        self.body = Some(body.into());
        self
    }

    /// Set JSON body and Content-Type header
    pub fn with_json<T: Serialize>(mut self, data: &T) -> Result<Self, serde_json::Error> {
        self.headers
            .insert("Content-Type".to_string(), "application/json".to_string());
        self.body = Some(serde_json::to_string(data)?);
        Ok(self)
    }

    /// Add Authorization Bearer token
    pub fn with_bearer_token(mut self, token: impl Into<String>) -> Self {
        self.headers
            .insert("Authorization".to_string(), format!("Bearer {}", token.into()));
        self
    }
}

/// HTTP response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpResponse {
    /// HTTP status code
    pub status: u16,
    /// Response headers
    pub headers: HashMap<String, String>,
    /// Response body
    pub body: String,
}

impl HttpResponse {
    /// Check if the response status is successful (2xx)
    pub fn is_success(&self) -> bool {
        self.status >= 200 && self.status < 300
    }

    /// Parse the response body as JSON
    pub fn json<T: for<'de> Deserialize<'de>>(&self) -> Result<T, serde_json::Error> {
        serde_json::from_str(&self.body)
    }
}

/// Plugin configuration storage
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginConfig {
    /// Configuration values
    pub values: HashMap<String, serde_json::Value>,
}

impl PluginConfig {
    /// Create a new empty configuration
    pub fn new() -> Self {
        Self::default()
    }

    /// Get a value by key
    pub fn get<T: for<'de> Deserialize<'de>>(&self, key: &str) -> Option<T> {
        self.values.get(key).and_then(|v| serde_json::from_value(v.clone()).ok())
    }

    /// Set a value
    pub fn set<T: Serialize>(&mut self, key: impl Into<String>, value: T) -> Result<(), serde_json::Error> {
        self.values.insert(key.into(), serde_json::to_value(value)?);
        Ok(())
    }

    /// Check if a key exists
    pub fn has(&self, key: &str) -> bool {
        self.values.contains_key(key)
    }

    /// Remove a key
    pub fn remove(&mut self, key: &str) -> Option<serde_json::Value> {
        self.values.remove(key)
    }
}

/// Log levels
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

impl std::fmt::Display for LogLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LogLevel::Debug => write!(f, "debug"),
            LogLevel::Info => write!(f, "info"),
            LogLevel::Warn => write!(f, "warn"),
            LogLevel::Error => write!(f, "error"),
        }
    }
}

// ============================================
// AI Tool Types
// ============================================

/// Input provided to an AI tool execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIToolInput {
    /// The name of the tool being executed
    pub tool: String,
    /// The tool arguments as a JSON object
    pub arguments: serde_json::Value,
}

impl AIToolInput {
    /// Get an argument by key
    pub fn get<T: for<'de> Deserialize<'de>>(&self, key: &str) -> Option<T> {
        self.arguments.get(key).and_then(|v| serde_json::from_value(v.clone()).ok())
    }

    /// Get a required string argument
    pub fn get_string(&self, key: &str) -> Option<String> {
        self.arguments.get(key).and_then(|v| v.as_str()).map(|s| s.to_string())
    }

    /// Get a required number argument
    pub fn get_number(&self, key: &str) -> Option<f64> {
        self.arguments.get(key).and_then(|v| v.as_f64())
    }

    /// Get a required boolean argument
    pub fn get_bool(&self, key: &str) -> Option<bool> {
        self.arguments.get(key).and_then(|v| v.as_bool())
    }
}

/// Output returned from an AI tool execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIToolOutput {
    /// The result of the tool execution (JSON string)
    pub result: String,
    /// Whether the execution resulted in an error
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_error: Option<bool>,
}

impl AIToolOutput {
    /// Create a successful tool output with JSON data
    pub fn success<T: Serialize>(data: &T) -> Result<Self, serde_json::Error> {
        Ok(Self {
            result: serde_json::to_string(data)?,
            is_error: None,
        })
    }

    /// Create a successful tool output with a string message
    pub fn message(msg: impl Into<String>) -> Self {
        Self {
            result: msg.into(),
            is_error: None,
        }
    }

    /// Create an error tool output
    pub fn error(msg: impl Into<String>) -> Self {
        Self {
            result: msg.into(),
            is_error: Some(true),
        }
    }
}

/// AI Tool Schema - describes a tool the AI can invoke
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIToolSchema {
    /// Human-readable description of what the tool does
    pub description: String,
    /// JSON Schema for tool parameters
    pub parameters: AIToolParameters,
}

/// AI Tool Parameters - JSON Schema object
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIToolParameters {
    /// Always "object"
    #[serde(rename = "type")]
    pub param_type: String,
    /// Property definitions
    pub properties: HashMap<String, AIToolProperty>,
    /// Required property names
    #[serde(default)]
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub required: Vec<String>,
}

impl AIToolParameters {
    /// Create a new parameters schema
    pub fn new() -> Self {
        Self {
            param_type: "object".to_string(),
            properties: HashMap::new(),
            required: Vec::new(),
        }
    }

    /// Add a property
    pub fn with_property(mut self, name: impl Into<String>, prop: AIToolProperty, required: bool) -> Self {
        let name = name.into();
        if required {
            self.required.push(name.clone());
        }
        self.properties.insert(name, prop);
        self
    }
}

impl Default for AIToolParameters {
    fn default() -> Self {
        Self::new()
    }
}

/// AI Tool Property - describes a single parameter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIToolProperty {
    /// Property type
    #[serde(rename = "type")]
    pub prop_type: String,
    /// Property description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Enum values (for string type)
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "enum")]
    pub enum_values: Option<Vec<String>>,
    /// Default value
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<serde_json::Value>,
}

impl AIToolProperty {
    /// Create a string property
    pub fn string(description: impl Into<String>) -> Self {
        Self {
            prop_type: "string".to_string(),
            description: Some(description.into()),
            enum_values: None,
            default: None,
        }
    }

    /// Create a number property
    pub fn number(description: impl Into<String>) -> Self {
        Self {
            prop_type: "number".to_string(),
            description: Some(description.into()),
            enum_values: None,
            default: None,
        }
    }

    /// Create a boolean property
    pub fn boolean(description: impl Into<String>) -> Self {
        Self {
            prop_type: "boolean".to_string(),
            description: Some(description.into()),
            enum_values: None,
            default: None,
        }
    }

    /// Create a string enum property
    pub fn string_enum(description: impl Into<String>, values: Vec<String>) -> Self {
        Self {
            prop_type: "string".to_string(),
            description: Some(description.into()),
            enum_values: Some(values),
            default: None,
        }
    }

    /// Add a default value
    pub fn with_default<T: Serialize>(mut self, value: T) -> Self {
        self.default = serde_json::to_value(value).ok();
        self
    }
}


