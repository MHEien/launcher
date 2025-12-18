# Hello Plugin (Rust)

A simple example plugin that demonstrates how to build Launcher plugins using Rust.

## Building

```bash
# Build the plugin (using the CLI tool)
launcher-plugin build

# Or manually with cargo
cargo build --target wasm32-unknown-unknown --release
cp target/wasm32-unknown-unknown/release/hello_plugin.wasm .

# Install locally for testing
launcher-plugin dev
```

## How it Works

This plugin demonstrates:

1. **Initialization** - The `init()` function is called when the plugin loads
2. **Search** - The `search()` function is called for every keystroke
3. **Results** - Returns `SearchResult` with title, subtitle, icon, and actions
4. **Actions** - Shows how to open URLs and copy to clipboard
5. **Shutdown** - The `shutdown()` function is called when the plugin unloads

## Usage

1. Build and install the plugin
2. Open Launcher (Alt+Space or Super+Space)
3. Type "hello" to see the plugin's results
4. Click a result to execute its action

## Project Structure

```
hello-plugin/
├── Cargo.toml           # Rust dependencies
├── manifest.json        # Plugin metadata
├── src/
│   └── lib.rs           # Plugin source code
└── hello_plugin.wasm    # Compiled WASM (after build)
```

## Using the SDK

The plugin uses the `launcher-plugin-sdk` crate which provides:

```rust
use launcher_plugin_sdk::prelude::*;

// Logging
log!(info, "Message: {}", value);

// Search results with builder pattern
SearchResult::new("id", "Title")
    .with_subtitle("Subtitle")
    .with_icon("🦀")
    .with_open_url("https://...")
    .with_copy("text to copy");

// HTTP requests (requires network permission)
let response = http_get("https://api.example.com")?;

// Configuration
let config = get_config()?;
```

## Learn More

See the [launcher-plugin-sdk](../../../../packages/plugin-sdk-rs/) crate for full API documentation.


