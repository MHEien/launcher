//! Host functions - these are provided by the Launcher runtime
//! and allow plugins to interact with the host system.

use crate::types::{HttpRequest, HttpResponse, LogLevel, PluginConfig};
use extism_pdk::*;

/// Log a message to the host console
pub fn log(level: LogLevel, message: &str) {
    let _ = extism_pdk::log!(
        match level {
            LogLevel::Debug => extism_pdk::LogLevel::Debug,
            LogLevel::Info => extism_pdk::LogLevel::Info,
            LogLevel::Warn => extism_pdk::LogLevel::Warn,
            LogLevel::Error => extism_pdk::LogLevel::Error,
        },
        "{}",
        message
    );
}

/// Log a debug message
pub fn log_debug(message: &str) {
    log(LogLevel::Debug, message);
}

/// Log an info message
pub fn log_info(message: &str) {
    log(LogLevel::Info, message);
}

/// Log a warning message
pub fn log_warn(message: &str) {
    log(LogLevel::Warn, message);
}

/// Log an error message
pub fn log_error(message: &str) {
    log(LogLevel::Error, message);
}

/// Logging macro for convenient formatted logging
/// 
/// # Example
/// ```rust,ignore
/// log!(info, "Processing query: {}", query);
/// log!(error, "Failed to fetch data: {}", error);
/// ```
#[macro_export]
macro_rules! log {
    (debug, $($arg:tt)*) => {
        $crate::host::log_debug(&format!($($arg)*))
    };
    (info, $($arg:tt)*) => {
        $crate::host::log_info(&format!($($arg)*))
    };
    (warn, $($arg:tt)*) => {
        $crate::host::log_warn(&format!($($arg)*))
    };
    (error, $($arg:tt)*) => {
        $crate::host::log_error(&format!($($arg)*))
    };
}

// Import host functions
#[host_fn]
extern "ExtismHost" {
    fn host_http_request(request_json: &str) -> String;
    fn host_get_config() -> String;
    fn host_set_config(config_json: &str);
    fn host_show_notification(title: &str, body: &str);
    fn host_get_oauth_token(provider: &str) -> String;
}

/// Make an HTTP request
/// 
/// # Example
/// ```rust,ignore
/// let response = http_request(HttpRequest::get("https://api.example.com/data"))?;
/// if response.is_success() {
///     let data: MyData = response.json()?;
/// }
/// ```
pub fn http_request(request: HttpRequest) -> Result<HttpResponse, Error> {
    let request_json = serde_json::to_string(&request)
        .map_err(|e| Error::msg(format!("Failed to serialize request: {}", e)))?;
    
    let response_json = unsafe { host_http_request(&request_json)? };
    
    serde_json::from_str(&response_json)
        .map_err(|e| Error::msg(format!("Failed to parse response: {}", e)))
}

/// Convenience function for GET requests
pub fn http_get(url: &str) -> Result<HttpResponse, Error> {
    http_request(HttpRequest::get(url))
}

/// Convenience function for GET requests with bearer token
pub fn http_get_with_token(url: &str, token: &str) -> Result<HttpResponse, Error> {
    http_request(HttpRequest::get(url).with_bearer_token(token))
}

/// Convenience function for POST requests
pub fn http_post(url: &str, body: Option<&str>) -> Result<HttpResponse, Error> {
    let mut req = HttpRequest::post(url);
    if let Some(body) = body {
        req = req.with_body(body);
    }
    http_request(req)
}

/// Convenience function for POST requests with JSON body
pub fn http_post_json<T: serde::Serialize>(url: &str, data: &T) -> Result<HttpResponse, Error> {
    let req = HttpRequest::post(url)
        .with_json(data)
        .map_err(|e| Error::msg(format!("Failed to serialize JSON: {}", e)))?;
    http_request(req)
}

/// Get the plugin's configuration
pub fn get_config() -> Result<PluginConfig, Error> {
    let config_json = unsafe { host_get_config()? };
    serde_json::from_str(&config_json)
        .map_err(|e| Error::msg(format!("Failed to parse config: {}", e)))
}

/// Set the plugin's configuration
pub fn set_config(config: &PluginConfig) -> Result<(), Error> {
    let config_json = serde_json::to_string(config)
        .map_err(|e| Error::msg(format!("Failed to serialize config: {}", e)))?;
    unsafe { host_set_config(&config_json)? };
    Ok(())
}

/// Show a system notification
/// 
/// # Note
/// Requires the `notifications` permission in the plugin manifest.
pub fn show_notification(title: &str, body: &str) -> Result<(), Error> {
    unsafe { host_show_notification(title, body)? };
    Ok(())
}

/// Get an OAuth token for a provider
/// 
/// # Note
/// Requires the `oauth:provider` permission in the plugin manifest.
/// 
/// # Example
/// ```rust,ignore
/// let token = get_oauth_token("github")?;
/// let response = http_get_with_token("https://api.github.com/user", &token)?;
/// ```
pub fn get_oauth_token(provider: &str) -> Result<String, Error> {
    unsafe { host_get_oauth_token(provider) }
}


