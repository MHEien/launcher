//! Hello Plugin (Rust)
//!
//! A simple example plugin that demonstrates how to build
//! Launcher plugins using Rust and the launcher-plugin-sdk.

use launcher_plugin_sdk::prelude::*;

/// Initialize the plugin
#[plugin_fn]
pub fn init() -> FnResult<()> {
    log!(info, "Hello Plugin (Rust) initialized!");
    Ok(())
}

/// Search handler - called when the user types a query
#[plugin_fn]
pub fn search(input: Json<SearchInput>) -> FnResult<Json<SearchOutput>> {
    let query = input.0.query.to_lowercase();
    
    log!(debug, "Hello Plugin (Rust) received search query: {}", query);
    
    let mut results = Vec::new();
    
    // Only show results if the query contains "hello" or starts with "hi"
    if query.contains("hello") || query.starts_with("hi") {
        results.push(
            SearchResult::new("hello-rust-greeting", "👋 Hello from Rust!")
                .with_subtitle("This is a Rust plugin")
                .with_icon("🦀")
                .with_score(100.0)
                .with_category("Examples"),
        );
        
        results.push(
            SearchResult::new("hello-rust-docs", "📚 Plugin SDK Documentation")
                .with_subtitle("Learn how to build plugins")
                .with_icon("📖")
                .with_score(90.0)
                .with_category("Examples")
                .with_open_url("https://github.com/launcher/launcher"),
        );
        
        results.push(
            SearchResult::new("hello-rust-copy", "📋 Copy \"Hello World\"")
                .with_subtitle("Click to copy to clipboard")
                .with_icon("📝")
                .with_score(80.0)
                .with_category("Examples")
                .with_copy("Hello World from Rust Plugin!"),
        );
    }
    
    // Echo back the query as a hint
    if !query.is_empty() && !query.contains("hello") && !query.starts_with("hi") {
        results.push(
            SearchResult::new("hello-rust-echo", "Type \"hello\" to see Rust plugin results")
                .with_subtitle(format!("Current query: \"{}\"", input.0.query))
                .with_icon("💡")
                .with_score(10.0)
                .with_category("Examples"),
        );
    }
    
    Ok(Json(SearchOutput::new(results)))
}

/// Shutdown handler - called when the plugin is unloaded
#[plugin_fn]
pub fn shutdown() -> FnResult<()> {
    log!(info, "Hello Plugin (Rust) shutting down...");
    Ok(())
}
