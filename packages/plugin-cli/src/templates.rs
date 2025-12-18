//! Plugin templates for scaffolding new plugins

use std::fs;
use std::path::Path;

/// Create a TypeScript plugin
pub fn create_typescript_plugin(dir: &Path, name: &str) -> Result<(), String> {
    // Create src directory
    fs::create_dir_all(dir.join("src"))
        .map_err(|e| format!("Failed to create src directory: {}", e))?;
    
    // Create manifest.json
    let manifest = format!(r#"{{
  "id": "{}",
  "name": "{}",
  "version": "0.1.0",
  "author": "Your Name",
  "description": "A Launcher plugin",
  "permissions": [],
  "entry": "plugin.wasm",
  "provides": {{
    "providers": ["{}"],
    "actions": [],
    "ai_tools": []
  }}
}}
"#, name, title_case(name), name);
    
    fs::write(dir.join("manifest.json"), manifest)
        .map_err(|e| format!("Failed to write manifest.json: {}", e))?;
    
    // Create package.json
    let package_json = format!(r#"{{
  "name": "{}",
  "version": "0.1.0",
  "description": "A Launcher plugin",
  "type": "module",
  "scripts": {{
    "build": "extism-js src/index.ts -o plugin.wasm",
    "dev": "launcher-plugin dev",
    "package": "launcher-plugin package"
  }},
  "dependencies": {{
    "@launcher/plugin-sdk": "^0.1.0"
  }},
  "devDependencies": {{
    "@extism/js-pdk": "^1.0.0",
    "typescript": "^5.3.0"
  }}
}}
"#, name);
    
    fs::write(dir.join("package.json"), package_json)
        .map_err(|e| format!("Failed to write package.json: {}", e))?;
    
    // Create tsconfig.json
    let tsconfig = r#"{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
"#;
    
    fs::write(dir.join("tsconfig.json"), tsconfig)
        .map_err(|e| format!("Failed to write tsconfig.json: {}", e))?;
    
    // Create src/index.ts
    let plugin_code = format!(r#"/**
 * {} - A Launcher Plugin
 */

import {{ 
  Plugin, 
  SearchResult, 
  registerPlugin,
  createResult,
  createUrlResult,
}} from '@launcher/plugin-sdk';

// Declare Host for Extism
declare const Host: {{
  inputString(): string;
  outputString(s: string): void;
}};

class {}Plugin extends Plugin {{
  init() {{
    // Called when the plugin loads
    console.log('{} plugin initialized!');
  }}

  search(query: string): SearchResult[] {{
    // Return empty results for empty queries
    if (!query || query.length < 2) {{
      return [];
    }}

    // Example results - replace with your own logic
    return [
      createResult(
        'example-1',
        `Hello from {}!`,
        {{
          subtitle: `You searched for: ${{query}}`,
          icon: '👋',
        }}
      ),
      createUrlResult(
        'example-2',
        'Open Example Website',
        'https://example.com',
        {{
          subtitle: 'Opens in browser',
          icon: '🌐',
        }}
      ),
    ];
  }}

  shutdown() {{
    // Called when the plugin unloads
    console.log('{} plugin shutting down');
  }}
}}

// Register the plugin
const plugin = new {}Plugin();
registerPlugin(plugin);

// Export functions for Extism
export function init() {{
  plugin.init();
}}

export function search(): string {{
  const input = JSON.parse(Host.inputString());
  const results = plugin.search(input.query);
  return JSON.stringify({{ results }});
}}

export function shutdown() {{
  plugin.shutdown();
}}
"#, 
    title_case(name), 
    pascal_case(name),
    title_case(name),
    title_case(name),
    title_case(name),
    pascal_case(name)
    );
    
    fs::write(dir.join("src/index.ts"), plugin_code)
        .map_err(|e| format!("Failed to write src/index.ts: {}", e))?;
    
    // Create .gitignore
    let gitignore = r#"node_modules/
dist/
*.wasm
.DS_Store
"#;
    
    fs::write(dir.join(".gitignore"), gitignore)
        .map_err(|e| format!("Failed to write .gitignore: {}", e))?;
    
    // Create README.md
    let readme = format!(r#"# {}

A Launcher plugin.

## Development

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Install locally for testing
npm run dev

# Package for distribution
npm run package
```

## Usage

After installing the plugin in Launcher, you can search for "example" to see it in action.
"#, title_case(name));
    
    fs::write(dir.join("README.md"), readme)
        .map_err(|e| format!("Failed to write README.md: {}", e))?;
    
    Ok(())
}

/// Create a Rust plugin
pub fn create_rust_plugin(dir: &Path, name: &str) -> Result<(), String> {
    // Create src directory
    fs::create_dir_all(dir.join("src"))
        .map_err(|e| format!("Failed to create src directory: {}", e))?;
    
    // Create manifest.json
    let manifest = format!(r#"{{
  "id": "{}",
  "name": "{}",
  "version": "0.1.0",
  "author": "Your Name",
  "description": "A Launcher plugin",
  "permissions": [],
  "entry": "{}.wasm",
  "provides": {{
    "providers": ["{}"],
    "actions": [],
    "ai_tools": []
  }}
}}
"#, name, title_case(name), name.replace('-', "_"), name);
    
    fs::write(dir.join("manifest.json"), manifest)
        .map_err(|e| format!("Failed to write manifest.json: {}", e))?;
    
    // Create Cargo.toml
    let cargo_toml = format!(r#"[package]
name = "{}"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
launcher-plugin-sdk = "0.1"

[profile.release]
opt-level = "s"
lto = true
"#, name);
    
    fs::write(dir.join("Cargo.toml"), cargo_toml)
        .map_err(|e| format!("Failed to write Cargo.toml: {}", e))?;
    
    // Create src/lib.rs
    let lib_code = format!(r#"//! {} - A Launcher Plugin

use launcher_plugin_sdk::prelude::*;

/// Initialize the plugin
#[plugin_fn]
pub fn init() -> FnResult<()> {{
    log!(info, "{} plugin initialized!");
    Ok(())
}}

/// Search handler
#[plugin_fn]
pub fn search(input: Json<SearchInput>) -> FnResult<Json<SearchOutput>> {{
    let query = &input.0.query;
    
    // Return empty results for short queries
    if query.len() < 2 {{
        return Ok(Json(SearchOutput::empty()));
    }}
    
    log!(debug, "Searching for: {{}}", query);
    
    // Example results - replace with your own logic
    let results = vec![
        SearchResult::new("example-1", format!("Hello from {}!"))
            .with_subtitle(format!("You searched for: {{}}", query))
            .with_icon("👋"),
        SearchResult::new("example-2", "Open Example Website")
            .with_subtitle("Opens in browser")
            .with_icon("🌐")
            .with_open_url("https://example.com"),
    ];
    
    Ok(Json(SearchOutput::new(results)))
}}

/// Shutdown the plugin
#[plugin_fn]
pub fn shutdown() -> FnResult<()> {{
    log!(info, "{} plugin shutting down");
    Ok(())
}}
"#, 
    title_case(name),
    title_case(name),
    title_case(name),
    title_case(name)
    );
    
    fs::write(dir.join("src/lib.rs"), lib_code)
        .map_err(|e| format!("Failed to write src/lib.rs: {}", e))?;
    
    // Create .gitignore
    let gitignore = r#"target/
*.wasm
Cargo.lock
.DS_Store
"#;
    
    fs::write(dir.join(".gitignore"), gitignore)
        .map_err(|e| format!("Failed to write .gitignore: {}", e))?;
    
    // Create README.md
    let readme = format!(r#"# {}

A Launcher plugin written in Rust.

## Development

```bash
# Build the plugin
launcher-plugin build

# Build in release mode
launcher-plugin build --release

# Install locally for testing
launcher-plugin dev

# Package for distribution
launcher-plugin package
```

## Usage

After installing the plugin in Launcher, you can search for "example" to see it in action.
"#, title_case(name));
    
    fs::write(dir.join("README.md"), readme)
        .map_err(|e| format!("Failed to write README.md: {}", e))?;
    
    Ok(())
}

/// Convert kebab-case to Title Case
fn title_case(s: &str) -> String {
    s.split('-')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().chain(chars).collect(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Convert kebab-case to PascalCase
fn pascal_case(s: &str) -> String {
    s.split('-')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().chain(chars).collect(),
            }
        })
        .collect::<Vec<_>>()
        .join("")
}


