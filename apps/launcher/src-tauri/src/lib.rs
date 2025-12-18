mod auth;
mod codex;
mod config;
mod frecency;
mod indexer;
mod oauth;
mod plugins;
mod providers;
mod theme;

use auth::{AuthState, WebAuth};
use codex::{
    BunInstallStatus, CodexAuthStatus, CodexManager, CodexStatus, PackageManager,
    PackageManagerInfo, SessionInfo, SessionMessage,
};
use frecency::FrecencyStore;
use oauth::providers::{
    GitHubProvider as OAuthGitHubConfig, GoogleProvider as OAuthGoogleConfig,
    NotionProvider as OAuthNotionConfig, OAuthProvider, SlackProvider as OAuthSlackConfig,
};
use oauth::{CallbackServer, OAuthFlow, TokenStorage};
use plugins::{
    MarketplaceResponse, PluginInfo, PluginLoader, PluginRegistry, PluginRuntime, RegistryPlugin,
};
use providers::{
    apps::AppProvider, calculator::CalculatorProvider, files::FileProvider, github::GitHubProvider,
    google_calendar::GoogleCalendarProvider, google_drive::GoogleDriveProvider,
    notion::NotionProvider, plugins::PluginProvider, slack::SlackProvider, SearchProvider,
    SearchResult,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use theme::SystemTheme;

struct AppState {
    providers: Vec<Arc<dyn SearchProvider>>,
    file_provider: Arc<FileProvider>,
    frecency: Arc<FrecencyStore>,
    plugin_loader: Arc<PluginLoader>,
    plugin_runtime: Arc<PluginRuntime>,
    plugin_registry: Arc<PluginRegistry>,
    oauth_flow: Arc<OAuthFlow>,
    callback_server: Arc<CallbackServer>,
    web_auth: Arc<WebAuth>,
    codex_manager: Arc<CodexManager>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct IndexingStatus {
    is_indexing: bool,
    files_indexed: usize,
    message: String,
}

#[tauri::command]
fn search(query: &str, state: tauri::State<AppState>) -> Vec<SearchResult> {
    let mut all_results: Vec<SearchResult> = Vec::new();

    for provider in &state.providers {
        let results = provider.search(query);
        all_results.extend(results);
    }

    for result in &mut all_results {
        let frecency_boost = state.frecency.get_boost(&result.id);
        result.score += frecency_boost as f32;
    }

    all_results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
    all_results.truncate(20);
    all_results
}

#[tauri::command]
fn execute_result(result_id: &str, state: tauri::State<AppState>) -> Result<(), String> {
    state.frecency.record_access(result_id);

    for provider in &state.providers {
        if result_id.starts_with(&format!("{}:", provider.id()))
            || (provider.id() == "apps" && result_id.starts_with("app:"))
            || (provider.id() == "calculator" && result_id.starts_with("calc:"))
            || (provider.id() == "files" && result_id.starts_with("file:"))
        {
            return provider.execute(result_id);
        }
    }
    Err("No provider found for result".to_string())
}

#[tauri::command]
fn get_system_theme() -> SystemTheme {
    theme::get_system_theme()
}

#[tauri::command]
fn hide_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[tauri::command]
fn show_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
async fn start_indexing(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<usize, String> {
    let file_provider = state.file_provider.clone();

    let _ = app.emit(
        "indexing-status",
        IndexingStatus {
            is_indexing: true,
            files_indexed: 0,
            message: "Starting file indexing...".to_string(),
        },
    );

    let result = tokio::task::spawn_blocking(move || file_provider.initialize())
        .await
        .map_err(|e| e.to_string())?;

    let count = result?;

    let _ = app.emit(
        "indexing-status",
        IndexingStatus {
            is_indexing: false,
            files_indexed: count,
            message: format!("Indexed {} files", count),
        },
    );

    Ok(count)
}

#[tauri::command]
fn get_index_status(state: tauri::State<AppState>) -> bool {
    state.file_provider.is_initialized()
}

#[tauri::command]
fn list_plugins(state: tauri::State<AppState>) -> Vec<PluginInfo> {
    state.plugin_loader.list_plugins()
}

#[tauri::command]
fn enable_plugin(id: &str, state: tauri::State<AppState>) -> Result<(), String> {
    state.plugin_loader.enable_plugin(id)?;
    if let Some(plugin) = state.plugin_loader.get_plugin(id) {
        if !state.plugin_runtime.is_loaded(id) {
            state.plugin_runtime.load_plugin(&plugin)?;
        }
    }
    Ok(())
}

#[tauri::command]
fn disable_plugin(id: &str, state: tauri::State<AppState>) -> Result<(), String> {
    state.plugin_loader.disable_plugin(id)?;
    state.plugin_runtime.unload_plugin(id)?;
    Ok(())
}

#[tauri::command]
fn get_plugins_dir(state: tauri::State<AppState>) -> String {
    state
        .plugin_loader
        .plugins_dir()
        .to_string_lossy()
        .to_string()
}

#[tauri::command]
fn get_index_config(state: tauri::State<AppState>) -> indexer::IndexConfig {
    state.file_provider.get_config()
}

#[tauri::command]
fn set_index_config(
    config: indexer::IndexConfig,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    config.save()?;
    state.file_provider.set_config(config);
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct OAuthProviderInfo {
    id: String,
    name: String,
    connected: bool,
}

#[tauri::command]
fn list_oauth_providers(state: tauri::State<AppState>) -> Vec<OAuthProviderInfo> {
    state
        .oauth_flow
        .list_providers()
        .into_iter()
        .map(|p| OAuthProviderInfo {
            id: p.id.clone(),
            name: p.name.clone(),
            connected: state.oauth_flow.is_connected(&p.id),
        })
        .collect()
}

#[tauri::command]
fn start_oauth(provider_id: &str, state: tauri::State<AppState>) -> Result<String, String> {
    let redirect_uri = "http://localhost:19284/oauth/callback";
    state.oauth_flow.start_auth(provider_id, None, redirect_uri)
}

#[tauri::command]
async fn complete_oauth(
    state: &str,
    code: &str,
    app_state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    app_state.oauth_flow.exchange_code(state, code).await?;
    Ok(())
}

#[tauri::command]
fn disconnect_oauth(provider_id: &str, state: tauri::State<AppState>) -> Result<(), String> {
    state.oauth_flow.disconnect(provider_id)
}

#[tauri::command]
fn is_oauth_connected(provider_id: &str, state: tauri::State<AppState>) -> bool {
    state.oauth_flow.is_connected(provider_id)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct OAuthCredentials {
    client_id: Option<String>,
    client_secret: Option<String>,
}

#[tauri::command]
fn get_oauth_credentials(provider_id: &str, state: tauri::State<AppState>) -> OAuthCredentials {
    state
        .oauth_flow
        .get_provider(provider_id)
        .map(|p| OAuthCredentials {
            client_id: p.client_id,
            client_secret: p.client_secret,
        })
        .unwrap_or(OAuthCredentials {
            client_id: None,
            client_secret: None,
        })
}

#[tauri::command]
fn set_oauth_credentials(
    provider_id: &str,
    client_id: Option<String>,
    client_secret: Option<String>,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    state
        .oauth_flow
        .update_provider_credentials(provider_id, client_id, client_secret)
}

// Web App Authentication commands
#[tauri::command]
fn get_auth_state(state: tauri::State<AppState>) -> AuthState {
    state.web_auth.get_auth_state()
}

#[tauri::command]
fn get_login_url(state: tauri::State<AppState>) -> String {
    state.web_auth.get_login_url()
}

#[tauri::command]
fn open_login(app: AppHandle, state: tauri::State<AppState>) -> Result<(), String> {
    let url = state.web_auth.get_login_url();
    tauri_plugin_opener::open_url(&url, None::<&str>)
        .map_err(|e| format!("Failed to open browser: {}", e))
}

#[tauri::command]
async fn handle_auth_callback(
    token: &str,
    state: tauri::State<'_, AppState>,
) -> Result<AuthState, String> {
    state.web_auth.handle_callback(token).await?;
    Ok(state.web_auth.get_auth_state())
}

#[tauri::command]
fn logout(state: tauri::State<AppState>) -> Result<AuthState, String> {
    state.web_auth.logout()?;
    Ok(state.web_auth.get_auth_state())
}

#[tauri::command]
fn get_access_token(state: tauri::State<AppState>) -> Option<String> {
    state.web_auth.get_access_token()
}

// Marketplace commands
use config::CONFIG;

#[tauri::command]
async fn refresh_marketplace(
    state: tauri::State<'_, AppState>,
) -> Result<MarketplaceResponse, String> {
    // Fetch from server API
    state.plugin_registry.fetch_from_server().await?;

    // Return updated list with status
    Ok(state.plugin_registry.list_plugins_with_status())
}

#[tauri::command]
fn list_marketplace_plugins(state: tauri::State<AppState>) -> MarketplaceResponse {
    state.plugin_registry.list_plugins_with_status()
}

#[tauri::command]
fn search_marketplace(query: &str, state: tauri::State<AppState>) -> Vec<RegistryPlugin> {
    state.plugin_registry.search(query)
}

#[tauri::command]
fn get_marketplace_categories(state: tauri::State<AppState>) -> Vec<String> {
    state.plugin_registry.categories()
}

#[tauri::command]
fn get_marketplace_plugin(id: &str, state: tauri::State<AppState>) -> Option<RegistryPlugin> {
    state.plugin_registry.get_plugin(id)
}

#[tauri::command]
async fn install_plugin(id: &str, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let plugin = state
        .plugin_registry
        .get_plugin(id)
        .ok_or_else(|| format!("Plugin not found: {}", id))?;

    let plugins_dir = state.plugin_loader.plugins_dir();
    let plugin_dir = plugins_dir.join(&plugin.id);

    // Handle local plugins (from examples directory)
    if plugin.download_url.starts_with("local://") {
        let local_path = plugin.download_url.strip_prefix("local://").unwrap();
        let source_dir = std::env::current_dir()
            .map_err(|e| e.to_string())?
            .parent()
            .ok_or("Cannot find parent directory")?
            .join(local_path);

        if !source_dir.exists() {
            return Err(format!(
                "Local plugin source not found: {}",
                source_dir.display()
            ));
        }

        // Copy plugin directory
        std::fs::create_dir_all(&plugin_dir).map_err(|e| e.to_string())?;
        copy_dir_recursive(&source_dir, &plugin_dir)?;

        // Rescan plugins
        state.plugin_loader.scan_plugins()?;

        return Ok(());
    }

    // Download remote plugin
    let response = reqwest::get(&plugin.download_url)
        .await
        .map_err(|e| format!("Failed to download plugin: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Download failed with status: {}",
            response.status()
        ));
    }

    let bytes = response.bytes().await.map_err(|e| e.to_string())?;

    // Create plugin directory and extract
    std::fs::create_dir_all(&plugin_dir).map_err(|e| e.to_string())?;

    // For now, assume it's a zip file
    let cursor = std::io::Cursor::new(bytes);
    let mut archive =
        zip::ZipArchive::new(cursor).map_err(|e| format!("Failed to read zip archive: {}", e))?;

    archive
        .extract(&plugin_dir)
        .map_err(|e| format!("Failed to extract plugin: {}", e))?;

    // Rescan plugins
    state.plugin_loader.scan_plugins()?;

    Ok(())
}

#[tauri::command]
fn uninstall_plugin(id: &str, state: tauri::State<AppState>) -> Result<(), String> {
    state.plugin_loader.uninstall_plugin(id)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PluginUpdate {
    id: String,
    name: String,
    current_version: String,
    latest_version: String,
}

#[tauri::command]
fn check_plugin_updates(state: tauri::State<AppState>) -> Vec<PluginUpdate> {
    let installed = state.plugin_loader.list_plugins();
    let mut updates = Vec::new();

    for plugin in installed {
        if let Some(registry_plugin) = state.plugin_registry.get_plugin(&plugin.id) {
            if registry_plugin.version != plugin.version {
                // Simple version comparison - registry version is different
                updates.push(PluginUpdate {
                    id: plugin.id,
                    name: plugin.name,
                    current_version: plugin.version,
                    latest_version: registry_plugin.version,
                });
            }
        }
    }

    updates
}

#[tauri::command]
async fn update_plugin(id: &str, state: tauri::State<'_, AppState>) -> Result<(), String> {
    // Uninstall current version
    state.plugin_loader.uninstall_plugin(id)?;

    // Install latest from registry
    let plugin = state
        .plugin_registry
        .get_plugin(id)
        .ok_or_else(|| format!("Plugin not found in registry: {}", id))?;

    let plugins_dir = state.plugin_loader.plugins_dir();
    let plugin_dir = plugins_dir.join(&plugin.id);

    // Handle local plugins
    if plugin.download_url.starts_with("local://") {
        let local_path = plugin.download_url.strip_prefix("local://").unwrap();
        let source_dir = std::env::current_dir()
            .map_err(|e| e.to_string())?
            .parent()
            .ok_or("Cannot find parent directory")?
            .join(local_path);

        if !source_dir.exists() {
            return Err(format!(
                "Local plugin source not found: {}",
                source_dir.display()
            ));
        }

        std::fs::create_dir_all(&plugin_dir).map_err(|e| e.to_string())?;
        copy_dir_recursive(&source_dir, &plugin_dir)?;
        state.plugin_loader.scan_plugins()?;
        return Ok(());
    }

    // Download remote plugin
    let response = reqwest::get(&plugin.download_url)
        .await
        .map_err(|e| format!("Failed to download plugin: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Download failed with status: {}",
            response.status()
        ));
    }

    let bytes = response.bytes().await.map_err(|e| e.to_string())?;

    std::fs::create_dir_all(&plugin_dir).map_err(|e| e.to_string())?;

    let cursor = std::io::Cursor::new(bytes);
    let mut archive =
        zip::ZipArchive::new(cursor).map_err(|e| format!("Failed to read zip archive: {}", e))?;

    archive
        .extract(&plugin_dir)
        .map_err(|e| format!("Failed to extract plugin: {}", e))?;

    state.plugin_loader.scan_plugins()?;

    Ok(())
}

fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> Result<(), String> {
    if !dst.exists() {
        std::fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    }

    for entry in std::fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

// ============================================
// AI Tool Commands
// ============================================

/// Tool definition that can be sent to the AI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
    pub source: String,
}

/// Get all AI tools from enabled plugins
#[tauri::command]
fn get_plugin_ai_tools(state: tauri::State<AppState>) -> Vec<AIToolDefinition> {
    let mut tools = Vec::new();

    // Get all enabled plugins
    let plugins = state.plugin_loader.list_plugins();

    for plugin_info in plugins {
        if !plugin_info.enabled {
            continue;
        }

        // Get the loaded plugin to access its manifest
        if let Some(plugin) = state.plugin_loader.get_plugin(&plugin_info.id) {
            // Get AI tool schemas from manifest
            for (tool_name, schema) in &plugin.manifest.ai_tool_schemas {
                tools.push(AIToolDefinition {
                    name: tool_name.clone(),
                    description: schema.description.clone(),
                    parameters: serde_json::json!({
                        "type": schema.parameters.param_type,
                        "properties": schema.parameters.properties,
                        "required": schema.parameters.required,
                    }),
                    source: plugin_info.id.clone(),
                });
            }
        }
    }

    tools
}

/// Execute an AI tool via a plugin
#[tauri::command]
fn execute_plugin_ai_tool(
    plugin_id: &str,
    tool_name: &str,
    args: &str,
    state: tauri::State<AppState>,
) -> Result<String, String> {
    // Parse the arguments
    let args_value: serde_json::Value =
        serde_json::from_str(args).map_err(|e| format!("Failed to parse tool arguments: {}", e))?;

    // Create tool input JSON
    let tool_input = serde_json::json!({
        "tool": tool_name,
        "arguments": args_value,
    });
    let tool_input_str = serde_json::to_string(&tool_input)
        .map_err(|e| format!("Failed to serialize tool input: {}", e))?;

    // Call the plugin's execute_ai_tool function
    let result = state
        .plugin_runtime
        .call_ai_tool(plugin_id, &tool_input_str)?;

    Ok(result)
}

/// Get the current auth token for API calls
#[tauri::command]
fn get_auth_token(state: tauri::State<AppState>) -> Result<String, String> {
    state
        .web_auth
        .get_access_token()
        .ok_or_else(|| "Not authenticated".to_string())
}

/// Get recent files from the indexer for AI context
#[tauri::command]
fn get_recent_files(limit: usize, state: tauri::State<AppState>) -> Vec<String> {
    // Get files from the frecency store (most accessed files)
    state
        .frecency
        .get_top_items(limit)
        .into_iter()
        .filter(|id| id.starts_with("file:"))
        .map(|id| id.strip_prefix("file:").unwrap_or(&id).to_string())
        .collect()
}

/// Get indexed apps for AI context
#[tauri::command]
fn get_indexed_apps(limit: usize, state: tauri::State<AppState>) -> Vec<String> {
    // Search for apps with empty query to get all
    let results = state
        .providers
        .iter()
        .find(|p| p.id() == "apps")
        .map(|p| p.search(""))
        .unwrap_or_default();

    results.into_iter().take(limit).map(|r| r.title).collect()
}

/// Open a file from an AI file card
#[tauri::command]
fn open_file(path: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    Ok(())
}

/// Reveal a file in the file manager
#[tauri::command]
fn reveal_in_folder(path: &str) -> Result<(), String> {
    let path = std::path::Path::new(path);
    let folder = if path.is_file() {
        path.parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| path.to_path_buf())
    } else {
        path.to_path_buf()
    };

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to reveal file: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to reveal file: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(folder)
            .spawn()
            .map_err(|e| format!("Failed to reveal file: {}", e))?;
    }

    Ok(())
}

// ============================================
// Codex CLI Commands
// ============================================

/// Check if Codex CLI is installed
#[tauri::command]
async fn codex_check_installed(state: tauri::State<'_, AppState>) -> Result<CodexStatus, String> {
    Ok(state.codex_manager.check_installed().await)
}

/// Get available package managers for installing Codex
#[tauri::command]
async fn codex_get_package_managers(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<PackageManagerInfo>, String> {
    Ok(state.codex_manager.get_package_managers().await)
}

/// Install Codex using specified package manager
#[tauri::command]
async fn codex_install(
    package_manager: PackageManager,
    state: tauri::State<'_, AppState>,
) -> Result<CodexStatus, String> {
    state.codex_manager.install(package_manager).await
}

/// Auto-install Bun package manager
#[tauri::command]
async fn codex_install_bun(state: tauri::State<'_, AppState>) -> Result<BunInstallStatus, String> {
    match state.codex_manager.installer.install_bun().await {
        Ok(version) => Ok(BunInstallStatus::Completed { version }),
        Err(e) => Ok(BunInstallStatus::Failed { error: e }),
    }
}

/// Start Codex login flow
#[tauri::command]
async fn codex_login(state: tauri::State<'_, AppState>) -> Result<CodexAuthStatus, String> {
    state.codex_manager.login().await
}

/// Check if Codex authentication completed
#[tauri::command]
async fn codex_check_auth(state: tauri::State<'_, AppState>) -> Result<CodexAuthStatus, String> {
    Ok(state.codex_manager.check_auth_complete().await)
}

/// Get current Codex auth status
#[tauri::command]
async fn codex_get_auth_status(
    state: tauri::State<'_, AppState>,
) -> Result<CodexAuthStatus, String> {
    Ok(state.codex_manager.get_auth_status().await)
}

/// Get current Codex installation status
#[tauri::command]
async fn codex_get_status(state: tauri::State<'_, AppState>) -> Result<CodexStatus, String> {
    Ok(state.codex_manager.get_status().await)
}

/// Start a new Codex session
#[tauri::command]
async fn codex_start_session(
    working_dir: &str,
    state: tauri::State<'_, AppState>,
) -> Result<SessionInfo, String> {
    let session_id = state.codex_manager.create_session(working_dir).await?;

    // Start the session
    {
        let mut sessions = state.codex_manager.sessions.write().await;
        if let Some(session) = sessions.get_mut(&session_id) {
            session.start()?;
            return Ok(session.info());
        }
    }

    Err("Failed to start session".to_string())
}

/// Send a message to a Codex session
#[tauri::command]
async fn codex_send_message(
    session_id: &str,
    message: &str,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let sessions = state.codex_manager.sessions.read().await;
    if let Some(session) = sessions.get(session_id) {
        session.send_message(message).await
    } else {
        Err(format!("Session not found: {}", session_id))
    }
}

/// Stop a Codex session
#[tauri::command]
async fn codex_stop_session(
    session_id: &str,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let sessions = state.codex_manager.sessions.read().await;
    if let Some(session) = sessions.get(session_id) {
        session.stop().await
    } else {
        Err(format!("Session not found: {}", session_id))
    }
}

/// Get session info
#[tauri::command]
async fn codex_get_session_info(
    session_id: &str,
    state: tauri::State<'_, AppState>,
) -> Result<SessionInfo, String> {
    let sessions = state.codex_manager.sessions.read().await;
    if let Some(session) = sessions.get(session_id) {
        Ok(session.info())
    } else {
        Err(format!("Session not found: {}", session_id))
    }
}

/// Poll for session output messages
#[tauri::command]
async fn codex_poll_output(
    session_id: &str,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<SessionMessage>, String> {
    let sessions = state.codex_manager.sessions.read().await;
    if let Some(session) = sessions.get(session_id) {
        let mut messages = Vec::new();
        // Collect all available messages
        while let Some(msg) = session.try_recv().await {
            messages.push(msg);
        }
        Ok(messages)
    } else {
        Err(format!("Session not found: {}", session_id))
    }
}

fn toggle_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Set up panic hook to log panics before crashing
    std::panic::set_hook(Box::new(|panic_info| {
        let msg = format!("PANIC: {}", panic_info);
        eprintln!("{}", msg);
        // Also try to write to a log file for debugging
        if let Some(data_dir) = dirs::data_dir() {
            let log_path = data_dir.join("launcher").join("crash.log");
            let _ = std::fs::create_dir_all(data_dir.join("launcher"));
            let _ = std::fs::write(&log_path, &msg);
        }
    }));

    eprintln!("Launcher starting...");

    let file_provider = Arc::new(FileProvider::new());
    eprintln!("FileProvider initialized");

    let frecency = Arc::new(FrecencyStore::new());
    eprintln!("FrecencyStore initialized");

    let plugin_loader = Arc::new(PluginLoader::new());
    eprintln!("PluginLoader initialized");

    let plugin_runtime = match PluginRuntime::new() {
        Ok(runtime) => Arc::new(runtime),
        Err(e) => {
            eprintln!(
                "Failed to initialize plugin runtime: {}. Continuing without plugin support.",
                e
            );
            // Create a dummy runtime or handle gracefully
            Arc::new(PluginRuntime::new().expect("Plugin runtime failed twice"))
        }
    };
    eprintln!("PluginRuntime initialized");

    let plugin_provider = Arc::new(PluginProvider::new(
        plugin_loader.clone(),
        plugin_runtime.clone(),
    ));
    eprintln!("PluginProvider initialized");

    let plugin_registry = Arc::new(PluginRegistry::new());
    // Load from cache first for fast startup
    let _ = plugin_registry.load_cache();
    eprintln!("PluginRegistry initialized (from cache)");

    let token_storage = Arc::new(TokenStorage::new());
    let oauth_flow = Arc::new(OAuthFlow::new(token_storage));
    let callback_server = Arc::new(CallbackServer::new());
    let web_auth = Arc::new(WebAuth::new(&CONFIG.web_app_url));
    eprintln!("OAuth components initialized");

    let codex_manager = Arc::new(CodexManager::new());
    eprintln!("CodexManager initialized");

    oauth_flow.register_provider(OAuthGitHubConfig::new(None, None).config().clone());
    oauth_flow.register_provider(OAuthGoogleConfig::new(None, None).config().clone());
    oauth_flow.register_provider(OAuthNotionConfig::new(None, None).config().clone());
    oauth_flow.register_provider(OAuthSlackConfig::new(None, None).config().clone());
    eprintln!("OAuth providers registered");

    let github_provider = Arc::new(GitHubProvider::new(oauth_flow.clone()));
    let notion_provider = Arc::new(NotionProvider::new(oauth_flow.clone()));
    let slack_provider = Arc::new(SlackProvider::new(oauth_flow.clone()));
    let google_drive_provider = Arc::new(GoogleDriveProvider::new(oauth_flow.clone()));
    let google_calendar_provider = Arc::new(GoogleCalendarProvider::new(oauth_flow.clone()));
    eprintln!("Search providers created");

    eprintln!("Creating AppProvider...");
    let app_provider = Arc::new(AppProvider::new());
    eprintln!("AppProvider initialized");

    let providers: Vec<Arc<dyn SearchProvider>> = vec![
        Arc::new(CalculatorProvider::new()),
        app_provider,
        file_provider.clone(),
        plugin_provider,
        github_provider,
        notion_provider,
        slack_provider,
        google_drive_provider,
        google_calendar_provider,
    ];
    eprintln!("All providers ready, starting Tauri...");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // When a second instance is launched (e.g., from a deep link),
            // this callback receives the args and we can handle the deep link URL
            println!("Single instance callback - args: {:?}", args);
            for arg in args {
                if arg.starts_with("launcher://") {
                    if let Ok(url) = url::Url::parse(&arg) {
                        // For launcher://auth/callback, host() = "auth", path() = "/callback"
                        let host = url.host_str().unwrap_or("");
                        let path = url.path();
                        println!("Parsed URL - host: '{}', path: '{}'", host, path);

                        if host == "auth" && path == "/callback" {
                            if let Some(query) = url.query() {
                                for pair in query.split('&') {
                                    let mut parts = pair.split('=');
                                    if let (Some(key), Some(value)) = (parts.next(), parts.next()) {
                                        if key == "token" {
                                            println!(
                                                "Emitting auth-callback with token: {}...",
                                                &value[..8.min(value.len())]
                                            );
                                            let _ = app.emit("auth-callback", value.to_string());
                                        }
                                    }
                                }
                            }
                        }

                        // Handle plugin installation: launcher://install?plugin=<id>
                        if host == "install" || (host == "" && path.starts_with("/install")) {
                            if let Some(query) = url.query() {
                                for pair in query.split('&') {
                                    let mut parts = pair.split('=');
                                    if let (Some(key), Some(value)) = (parts.next(), parts.next()) {
                                        if key == "plugin" {
                                            println!(
                                                "Received install request for plugin: {}",
                                                value
                                            );
                                            let _ = app.emit("install-plugin", value.to_string());
                                            // Show the window so user can see the installation
                                            if let Some(window) = app.get_webview_window("main") {
                                                let _ = window.show();
                                                let _ = window.set_focus();
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }))
        .manage(AppState {
            providers,
            file_provider,
            frecency,
            plugin_loader,
            plugin_runtime,
            plugin_registry,
            oauth_flow,
            callback_server,
            web_auth,
            codex_manager,
        })
        .invoke_handler(tauri::generate_handler![
            search,
            execute_result,
            get_system_theme,
            hide_window,
            show_window,
            start_indexing,
            get_index_status,
            list_plugins,
            enable_plugin,
            disable_plugin,
            get_plugins_dir,
            get_index_config,
            set_index_config,
            list_oauth_providers,
            start_oauth,
            complete_oauth,
            disconnect_oauth,
            is_oauth_connected,
            get_oauth_credentials,
            set_oauth_credentials,
            list_marketplace_plugins,
            search_marketplace,
            get_marketplace_categories,
            get_marketplace_plugin,
            install_plugin,
            uninstall_plugin,
            check_plugin_updates,
            update_plugin,
            refresh_marketplace,
            get_auth_state,
            get_login_url,
            open_login,
            handle_auth_callback,
            logout,
            get_access_token,
            // AI Tool commands
            get_plugin_ai_tools,
            execute_plugin_ai_tool,
            get_auth_token,
            get_recent_files,
            get_indexed_apps,
            open_file,
            reveal_in_folder,
            // Codex CLI commands
            codex_check_installed,
            codex_get_package_managers,
            codex_install,
            codex_install_bun,
            codex_login,
            codex_check_auth,
            codex_get_auth_status,
            codex_get_status,
            codex_start_session,
            codex_send_message,
            codex_stop_session,
            codex_get_session_info,
            codex_poll_output
        ])
        .setup(|app| {
            // Set up system tray
            let show_item = MenuItem::with_id(app, "show", "Show Launcher", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // Load tray icon from embedded bytes
            let icon_bytes = include_bytes!("../icons/32x32.png");
            let icon = app.default_window_icon().cloned().unwrap_or_else(|| {
                image::load_from_memory(icon_bytes)
                    .map(|img| {
                        let rgba = img.to_rgba8();
                        let (width, height) = rgba.dimensions();
                        Image::new_owned(rgba.into_raw(), width, height)
                    })
                    .expect("Failed to load tray icon")
            });

            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Platform-specific shortcuts:
            // - Windows: Alt+Space (Super+Space is reserved for language switching)
            // - Linux: Super+Space (to avoid conflict with KRunner's Alt+Space)
            // - macOS: Super+Space (Spotlight-like)
            #[cfg(target_os = "windows")]
            let shortcut = Shortcut::new(Some(Modifiers::ALT), Code::Space);
            #[cfg(not(target_os = "windows"))]
            let shortcut = Shortcut::new(Some(Modifiers::SUPER), Code::Space);

            let app_handle = app.handle().clone();

            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |_app, _shortcut, event| {
                        if event.state() == ShortcutState::Pressed {
                            toggle_window(&app_handle);
                        }
                    })
                    .build(),
            )?;

            if let Err(e) = app.global_shortcut().register(shortcut) {
                eprintln!("Failed to register global shortcut: {}. The app will still work but you'll need to use the tray icon.", e);
            }

            let state = app.state::<AppState>();
            let plugin_loader = state.plugin_loader.clone();
            let plugin_runtime = state.plugin_runtime.clone();

            let callback_server = state.callback_server.clone();
            let oauth_flow = state.oauth_flow.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = callback_server.start(oauth_flow).await {
                    eprintln!("Failed to start OAuth callback server: {}", e);
                }
            });

            // Register deep link handler for launcher:// URLs
            let deep_link_handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                let urls = event.urls();
                for url in urls {
                    println!("Received deep link: {}", url);
                    // Parse launcher://auth/callback?token=xxx
                    if url.scheme() == "launcher" && url.path() == "/auth/callback" {
                        if let Some(query) = url.query() {
                            for pair in query.split('&') {
                                let mut parts = pair.split('=');
                                if let (Some(key), Some(value)) = (parts.next(), parts.next()) {
                                    if key == "token" {
                                        let _ = deep_link_handle
                                            .emit("auth-callback", value.to_string());
                                    }
                                }
                            }
                        }
                    }
                }
            });

            // Move plugin loading to background thread to avoid blocking startup
            let plugin_loader = state.plugin_loader.clone();
            let plugin_runtime = state.plugin_runtime.clone();

            std::thread::spawn(move || {
                match plugin_loader.scan_plugins() {
                    Ok(plugin_ids) => {
                        println!("Found {} plugins", plugin_ids.len());
                        for id in &plugin_ids {
                            if let Some(plugin) = plugin_loader.get_plugin(id) {
                                if plugin.enabled {
                                    match plugin_runtime.load_plugin(&plugin) {
                                        Ok(_) => println!("Loaded plugin: {}", id),
                                        Err(e) => eprintln!("Failed to load plugin {}: {}", id, e),
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => eprintln!("Failed to scan plugins: {}", e),
                }
            });

            let indexing_handle = app.handle().clone();
            let file_provider = state.file_provider.clone();

            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(2));

                let _ = indexing_handle.emit(
                    "indexing-status",
                    IndexingStatus {
                        is_indexing: true,
                        files_indexed: 0,
                        message: "Starting background indexing...".to_string(),
                    },
                );

                match file_provider.initialize() {
                    Ok(count) => {
                        let _ = indexing_handle.emit(
                            "indexing-status",
                            IndexingStatus {
                                is_indexing: false,
                                files_indexed: count,
                                message: format!("Indexed {} files", count),
                            },
                        );
                        println!("Background indexing complete: {} files", count);

                        if let Err(e) = file_provider.start_watcher() {
                            eprintln!("Failed to start file watcher: {}", e);
                        } else {
                            println!("File watcher started");

                            loop {
                                std::thread::sleep(std::time::Duration::from_secs(1));
                                let updated = file_provider.process_watcher_events();
                            }
                        }
                    }
                    Err(e) => {
                        let _ = indexing_handle.emit(
                            "indexing-status",
                            IndexingStatus {
                                is_indexing: false,
                                files_indexed: 0,
                                message: format!("Indexing failed: {}", e),
                            },
                        );
                        eprintln!("Background indexing failed: {}", e);
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
