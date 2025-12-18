//! CLI command implementations

use crate::templates;
use colored::*;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

/// Plugin manifest structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub author: Option<String>,
    pub description: Option<String>,
    pub permissions: Vec<String>,
    pub entry: String,
    pub provides: PluginProvides,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginProvides {
    #[serde(default)]
    pub providers: Vec<String>,
    #[serde(default)]
    pub actions: Vec<String>,
    #[serde(default)]
    pub ai_tools: Vec<String>,
}

/// Detect plugin language from current directory
fn detect_language() -> Option<String> {
    if Path::new("Cargo.toml").exists() {
        Some("rust".to_string())
    } else if Path::new("package.json").exists() {
        Some("ts".to_string())
    } else {
        None
    }
}

/// Load manifest from current directory
fn load_manifest() -> Result<PluginManifest, String> {
    let manifest_path = Path::new("manifest.json");
    if !manifest_path.exists() {
        return Err("manifest.json not found. Are you in a plugin directory?".to_string());
    }
    
    let content = fs::read_to_string(manifest_path)
        .map_err(|e| format!("Failed to read manifest.json: {}", e))?;
    
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse manifest.json: {}", e))
}

/// Get the plugins directory
fn get_plugins_dir() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("launcher")
        .join("plugins")
}

/// Create a new plugin
pub fn new_plugin(name: &str, lang: &str, output: Option<&str>) -> Result<(), String> {
    let lang = lang.to_lowercase();
    if lang != "ts" && lang != "typescript" && lang != "rust" && lang != "rs" {
        return Err(format!("Unsupported language: {}. Use 'ts' or 'rust'.", lang));
    }
    
    let is_typescript = lang == "ts" || lang == "typescript";
    let base_dir = output
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    let plugin_dir = base_dir.join(name);
    
    if plugin_dir.exists() {
        return Err(format!("Directory already exists: {}", plugin_dir.display()));
    }
    
    println!("{} {} plugin: {}", "Creating".green().bold(), 
        if is_typescript { "TypeScript" } else { "Rust" },
        name.cyan());
    
    // Create directory structure
    fs::create_dir_all(&plugin_dir)
        .map_err(|e| format!("Failed to create directory: {}", e))?;
    
    if is_typescript {
        templates::create_typescript_plugin(&plugin_dir, name)?;
    } else {
        templates::create_rust_plugin(&plugin_dir, name)?;
    }
    
    println!("\n{} Plugin created at: {}", "✓".green().bold(), plugin_dir.display());
    println!("\nNext steps:");
    println!("  cd {}", name);
    if is_typescript {
        println!("  npm install");
        println!("  launcher-plugin build");
    } else {
        println!("  launcher-plugin build");
    }
    
    Ok(())
}

/// Build the plugin
pub fn build_plugin(release: bool) -> Result<(), String> {
    let manifest = load_manifest()?;
    let lang = detect_language().ok_or("Could not detect plugin language. Make sure you have Cargo.toml or package.json")?;
    
    println!("{} {} plugin: {}", "Building".green().bold(), 
        if lang == "rust" { "Rust" } else { "TypeScript" },
        manifest.name.cyan());
    
    if lang == "rust" {
        build_rust_plugin(release)?;
    } else {
        build_typescript_plugin()?;
    }
    
    println!("\n{} Build complete: {}", "✓".green().bold(), manifest.entry);
    Ok(())
}

fn build_rust_plugin(release: bool) -> Result<(), String> {
    // Check if wasm32 target is installed
    let rustup_check = Command::new("rustup")
        .args(["target", "list", "--installed"])
        .output()
        .map_err(|e| format!("Failed to run rustup: {}", e))?;
    
    let installed_targets = String::from_utf8_lossy(&rustup_check.stdout);
    if !installed_targets.contains("wasm32-unknown-unknown") {
        println!("{} Installing wasm32-unknown-unknown target...", "→".blue());
        let install = Command::new("rustup")
            .args(["target", "add", "wasm32-unknown-unknown"])
            .status()
            .map_err(|e| format!("Failed to install WASM target: {}", e))?;
        
        if !install.success() {
            return Err("Failed to install wasm32-unknown-unknown target".to_string());
        }
    }
    
    // Build the plugin
    let mut args = vec!["build", "--target", "wasm32-unknown-unknown"];
    if release {
        args.push("--release");
    }
    
    println!("{} cargo {}", "→".blue(), args.join(" "));
    
    let status = Command::new("cargo")
        .args(&args)
        .status()
        .map_err(|e| format!("Failed to run cargo: {}", e))?;
    
    if !status.success() {
        return Err("Cargo build failed".to_string());
    }
    
    // Copy WASM file to plugin root
    let manifest = load_manifest()?;
    let profile = if release { "release" } else { "debug" };
    
    // Get crate name from Cargo.toml
    let cargo_toml = fs::read_to_string("Cargo.toml")
        .map_err(|e| format!("Failed to read Cargo.toml: {}", e))?;
    let cargo: toml::Value = cargo_toml.parse()
        .map_err(|e| format!("Failed to parse Cargo.toml: {}", e))?;
    let crate_name = cargo["package"]["name"]
        .as_str()
        .ok_or("Could not find package name in Cargo.toml")?
        .replace('-', "_");
    
    let wasm_source = PathBuf::from(format!(
        "target/wasm32-unknown-unknown/{}/{}.wasm",
        profile, crate_name
    ));
    
    if wasm_source.exists() {
        fs::copy(&wasm_source, &manifest.entry)
            .map_err(|e| format!("Failed to copy WASM file: {}", e))?;
    }
    
    Ok(())
}

fn build_typescript_plugin() -> Result<(), String> {
    // Check if @extism/js-pdk is available
    let npx_check = Command::new("npx")
        .args(["@extism/js-pdk", "--version"])
        .output();
    
    if npx_check.is_err() {
        return Err("@extism/js-pdk not found. Run: npm install -D @extism/js-pdk".to_string());
    }
    
    let manifest = load_manifest()?;
    
    // Find the main TypeScript/JavaScript file
    let main_file = if Path::new("src/index.ts").exists() {
        "src/index.ts"
    } else if Path::new("src/plugin.ts").exists() {
        "src/plugin.ts"
    } else if Path::new("plugin.ts").exists() {
        "plugin.ts"
    } else if Path::new("index.ts").exists() {
        "index.ts"
    } else {
        return Err("Could not find plugin entry file (src/index.ts, src/plugin.ts, plugin.ts, or index.ts)".to_string());
    };
    
    println!("{} npx @extism/js-pdk {} -o {}", "→".blue(), main_file, manifest.entry);
    
    let status = Command::new("npx")
        .args(["@extism/js-pdk", main_file, "-o", &manifest.entry])
        .status()
        .map_err(|e| format!("Failed to run extism-js: {}", e))?;
    
    if !status.success() {
        return Err("TypeScript build failed".to_string());
    }
    
    Ok(())
}

/// Build and install plugin for development
pub fn dev_plugin() -> Result<(), String> {
    // Build first
    build_plugin(false)?;
    
    let manifest = load_manifest()?;
    let plugins_dir = get_plugins_dir();
    let target_dir = plugins_dir.join(&manifest.id);
    
    println!("\n{} Installing to: {}", "→".blue(), target_dir.display());
    
    // Create plugins directory if needed
    fs::create_dir_all(&plugins_dir)
        .map_err(|e| format!("Failed to create plugins directory: {}", e))?;
    
    // Remove existing plugin if present
    if target_dir.exists() {
        fs::remove_dir_all(&target_dir)
            .map_err(|e| format!("Failed to remove existing plugin: {}", e))?;
    }
    
    // Create target directory
    fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create plugin directory: {}", e))?;
    
    // Copy manifest
    fs::copy("manifest.json", target_dir.join("manifest.json"))
        .map_err(|e| format!("Failed to copy manifest: {}", e))?;
    
    // Copy WASM file
    fs::copy(&manifest.entry, target_dir.join(&manifest.entry))
        .map_err(|e| format!("Failed to copy WASM file: {}", e))?;
    
    println!("{} Plugin installed for development", "✓".green().bold());
    println!("  Restart Launcher to load the plugin");
    
    Ok(())
}

/// Package plugin for distribution
pub fn package_plugin(output: Option<&str>) -> Result<(), String> {
    // Build in release mode first
    build_plugin(true)?;
    
    let manifest = load_manifest()?;
    let output_file = output
        .map(String::from)
        .unwrap_or_else(|| format!("{}-{}.zip", manifest.id, manifest.version));
    
    println!("\n{} Packaging: {}", "→".blue(), output_file);
    
    let file = fs::File::create(&output_file)
        .map_err(|e| format!("Failed to create output file: {}", e))?;
    let mut zip = zip::ZipWriter::new(file);
    
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    
    // Add manifest
    zip.start_file("manifest.json", options)
        .map_err(|e| format!("Failed to add manifest to zip: {}", e))?;
    let manifest_content = fs::read("manifest.json")
        .map_err(|e| format!("Failed to read manifest: {}", e))?;
    std::io::Write::write_all(&mut zip, &manifest_content)
        .map_err(|e| format!("Failed to write manifest to zip: {}", e))?;
    
    // Add WASM file
    zip.start_file(&manifest.entry, options)
        .map_err(|e| format!("Failed to add WASM to zip: {}", e))?;
    let wasm_content = fs::read(&manifest.entry)
        .map_err(|e| format!("Failed to read WASM: {}", e))?;
    std::io::Write::write_all(&mut zip, &wasm_content)
        .map_err(|e| format!("Failed to write WASM to zip: {}", e))?;
    
    zip.finish()
        .map_err(|e| format!("Failed to finalize zip: {}", e))?;
    
    let size = fs::metadata(&output_file)
        .map(|m| m.len())
        .unwrap_or(0);
    
    println!("{} Package created: {} ({:.1} KB)", "✓".green().bold(), output_file, size as f64 / 1024.0);
    
    Ok(())
}

/// Initialize a plugin in current directory
pub fn init_plugin(lang: &str) -> Result<(), String> {
    if Path::new("manifest.json").exists() {
        return Err("manifest.json already exists. This directory appears to be a plugin already.".to_string());
    }
    
    let lang = lang.to_lowercase();
    let is_typescript = lang == "ts" || lang == "typescript";
    
    // Get directory name as default plugin name
    let current_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;
    let name = current_dir
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("my-plugin");
    
    println!("{} {} plugin in current directory", "Initializing".green().bold(),
        if is_typescript { "TypeScript" } else { "Rust" });
    
    if is_typescript {
        templates::create_typescript_plugin(&current_dir, name)?;
    } else {
        templates::create_rust_plugin(&current_dir, name)?;
    }
    
    println!("{} Plugin initialized", "✓".green().bold());
    
    Ok(())
}

/// Check plugin for issues
pub fn check_plugin() -> Result<(), String> {
    let manifest = load_manifest()?;
    let mut issues: Vec<String> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();
    
    println!("{} Checking plugin: {}", "→".blue(), manifest.name.cyan());
    
    // Check manifest
    if manifest.id.is_empty() {
        issues.push("Plugin ID is empty".to_string());
    }
    if manifest.name.is_empty() {
        issues.push("Plugin name is empty".to_string());
    }
    if manifest.version.is_empty() {
        issues.push("Plugin version is empty".to_string());
    }
    if manifest.entry.is_empty() {
        issues.push("Plugin entry is empty".to_string());
    }
    if manifest.description.is_none() {
        warnings.push("Plugin description is missing".to_string());
    }
    if manifest.author.is_none() {
        warnings.push("Plugin author is missing".to_string());
    }
    
    // Check if WASM file exists
    if !Path::new(&manifest.entry).exists() {
        warnings.push(format!("WASM file not found: {}. Run 'launcher-plugin build' first.", manifest.entry));
    }
    
    // Check permissions
    for perm in &manifest.permissions {
        let valid_perms = ["network", "filesystem:read", "filesystem:write", "clipboard", "notifications"];
        if !valid_perms.contains(&perm.as_str()) && !perm.starts_with("oauth:") {
            warnings.push(format!("Unknown permission: {}", perm));
        }
    }
    
    // Report results
    if !warnings.is_empty() {
        println!("\n{}", "Warnings:".yellow().bold());
        for warn in &warnings {
            println!("  {} {}", "⚠".yellow(), warn);
        }
    }
    
    if !issues.is_empty() {
        println!("\n{}", "Issues:".red().bold());
        for issue in &issues {
            println!("  {} {}", "✗".red(), issue);
        }
        return Err(format!("Found {} issue(s)", issues.len()));
    }
    
    println!("\n{} No issues found", "✓".green().bold());
    
    Ok(())
}

/// Show plugin information
pub fn info_plugin() -> Result<(), String> {
    let manifest = load_manifest()?;
    let lang = detect_language().unwrap_or_else(|| "unknown".to_string());
    
    println!("{}", "Plugin Information".cyan().bold());
    println!("{}", "─".repeat(40));
    println!("  {}: {}", "Name".bold(), manifest.name);
    println!("  {}: {}", "ID".bold(), manifest.id);
    println!("  {}: {}", "Version".bold(), manifest.version);
    
    if let Some(author) = &manifest.author {
        println!("  {}: {}", "Author".bold(), author);
    }
    
    if let Some(desc) = &manifest.description {
        println!("  {}: {}", "Description".bold(), desc);
    }
    
    println!("  {}: {}", "Language".bold(), if lang == "rust" { "Rust" } else { "TypeScript" });
    println!("  {}: {}", "Entry".bold(), manifest.entry);
    
    if !manifest.permissions.is_empty() {
        println!("  {}: {}", "Permissions".bold(), manifest.permissions.join(", "));
    }
    
    if !manifest.provides.providers.is_empty() {
        println!("  {}: {}", "Providers".bold(), manifest.provides.providers.join(", "));
    }
    
    if !manifest.provides.actions.is_empty() {
        println!("  {}: {}", "Actions".bold(), manifest.provides.actions.join(", "));
    }
    
    // Check build status
    let wasm_exists = Path::new(&manifest.entry).exists();
    println!("\n  {}: {}", "Build Status".bold(), 
        if wasm_exists { "✓ Built".green() } else { "✗ Not built".red() });
    
    if wasm_exists {
        if let Ok(metadata) = fs::metadata(&manifest.entry) {
            println!("  {}: {:.1} KB", "WASM Size".bold(), metadata.len() as f64 / 1024.0);
        }
    }
    
    Ok(())
}

// Add toml parsing support
mod toml {
    pub use serde::de::Error as DeError;
    pub use serde::{Deserialize, Deserializer};
    
    #[derive(Debug, Clone)]
    pub enum Value {
        String(String),
        Table(std::collections::HashMap<String, Value>),
        Other,
    }
    
    impl Value {
        pub fn as_str(&self) -> Option<&str> {
            match self {
                Value::String(s) => Some(s),
                _ => None,
            }
        }
    }
    
    impl std::ops::Index<&str> for Value {
        type Output = Value;
        fn index(&self, key: &str) -> &Self::Output {
            match self {
                Value::Table(map) => map.get(key).unwrap_or(&Value::Other),
                _ => &Value::Other,
            }
        }
    }
    
    impl std::str::FromStr for Value {
        type Err = String;
        
        fn from_str(s: &str) -> Result<Self, Self::Err> {
            // Simple TOML parser for our needs
            let mut result = std::collections::HashMap::new();
            let mut current_table: Option<String> = None;
            
            for line in s.lines() {
                let line = line.trim();
                if line.is_empty() || line.starts_with('#') {
                    continue;
                }
                
                if line.starts_with('[') && line.ends_with(']') {
                    current_table = Some(line[1..line.len()-1].to_string());
                    continue;
                }
                
                if let Some(eq_pos) = line.find('=') {
                    let key = line[..eq_pos].trim();
                    let value = line[eq_pos+1..].trim().trim_matches('"');
                    
                    if let Some(ref table) = current_table {
                        let table_map = result
                            .entry(table.clone())
                            .or_insert_with(|| Value::Table(std::collections::HashMap::new()));
                        if let Value::Table(ref mut map) = table_map {
                            map.insert(key.to_string(), Value::String(value.to_string()));
                        }
                    } else {
                        result.insert(key.to_string(), Value::String(value.to_string()));
                    }
                }
            }
            
            Ok(Value::Table(result))
        }
    }
}


