# launcher-plugin-sdk

SDK for building Launcher plugins in Rust.

## Installation

Add to your `Cargo.toml`:

```toml
[package]
name = "my-plugin"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
launcher-plugin-sdk = "0.1"
```

## Quick Start

```rust
use launcher_plugin_sdk::prelude::*;

// Initialize the plugin (optional)
#[plugin_fn]
pub fn init() -> FnResult<()> {
    log!(info, "MyPlugin initialized!");
    Ok(())
}

// Search handler (required)
#[plugin_fn]
pub fn search(input: Json<SearchInput>) -> FnResult<Json<SearchOutput>> {
    let query = &input.0.query;
    
    if query.is_empty() {
        return Ok(Json(SearchOutput::empty()));
    }
    
    let results = vec![
        SearchResult::new("hello", "Hello World")
            .with_subtitle(format!("You searched for: {}", query))
            .with_icon("👋")
            .with_open_url("https://example.com"),
    ];
    
    Ok(Json(SearchOutput::new(results)))
}

// Shutdown handler (optional)
#[plugin_fn]
pub fn shutdown() -> FnResult<()> {
    log!(info, "MyPlugin shutting down");
    Ok(())
}
```

## Building

Build your plugin to WebAssembly:

```bash
cargo build --target wasm32-unknown-unknown --release
```

The output will be at `target/wasm32-unknown-unknown/release/my_plugin.wasm`.

## Plugin Structure

```
my-plugin/
├── Cargo.toml
├── manifest.json
└── src/
    └── lib.rs
```

### manifest.json

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "A sample plugin",
  "permissions": ["network"],
  "entry": "my_plugin.wasm",
  "provides": {
    "providers": ["my-search"]
  }
}
```

## API Reference

### Search Result Builder

```rust
SearchResult::new("id", "Title")
    .with_subtitle("Secondary text")
    .with_icon("🔍")
    .with_score(1.0)
    .with_category("Category")
    .with_open_url("https://...")  // Action: open URL
    .with_copy("text to copy")     // Action: copy to clipboard
    .with_command("echo hello")    // Action: run command
```

### HTTP Requests

```rust
// Simple GET
let response = http_get("https://api.example.com/data")?;

// GET with auth
let response = http_get_with_token("https://api.example.com/data", &token)?;

// POST with JSON
let response = http_post_json("https://api.example.com/data", &my_data)?;

// Custom request
let response = http_request(
    HttpRequest::post("https://api.example.com/data")
        .with_header("X-Custom", "value")
        .with_json(&data)?
)?;

// Parse response
if response.is_success() {
    let data: MyType = response.json()?;
}
```

### Configuration

```rust
// Get config
let config = get_config()?;
let api_key: Option<String> = config.get("api_key");

// Set config
let mut config = PluginConfig::new();
config.set("api_key", "my-secret-key")?;
set_config(&config)?;
```

### Logging

```rust
log!(debug, "Debug message: {}", value);
log!(info, "Info message");
log!(warn, "Warning: {}", warning);
log!(error, "Error: {}", error);
```

### Notifications

```rust
show_notification("Title", "Body")?;
```

### OAuth

```rust
let token = get_oauth_token("github")?;
let response = http_get_with_token("https://api.github.com/user", &token)?;
```

## Permissions

Declare required permissions in your `manifest.json`:

| Permission | Description |
|------------|-------------|
| `network` | Make HTTP requests |
| `filesystem:read` | Read files |
| `filesystem:write` | Write files |
| `clipboard` | Access clipboard |
| `notifications` | Show notifications |
| `oauth:provider` | OAuth for specific provider |

## Development

Use the Launcher CLI:

```bash
# Create new plugin
launcher-plugin new my-plugin --lang rust

# Build
launcher-plugin build

# Install locally for testing
launcher-plugin dev

# Package for distribution
launcher-plugin package
```


