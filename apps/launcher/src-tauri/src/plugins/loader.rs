use super::manifest::{LoadedPlugin, PluginManifest};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use parking_lot::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub id: String,
    pub name: String,
    pub version: String,
    pub author: Option<String>,
    pub description: Option<String>,
    pub permissions: Vec<String>,
    pub entry: String,
    pub enabled: bool,
}

pub struct PluginLoader {
    plugins_dir: PathBuf,
    plugins: RwLock<HashMap<String, LoadedPlugin>>,
}

impl PluginLoader {
    pub fn new() -> Self {
        let plugins_dir = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("launcher")
            .join("plugins");

        Self {
            plugins_dir,
            plugins: RwLock::new(HashMap::new()),
        }
    }

    pub fn scan_plugins(&self) -> Result<Vec<String>, String> {
        if !self.plugins_dir.exists() {
            std::fs::create_dir_all(&self.plugins_dir)
                .map_err(|e| format!("Failed to create plugins directory: {}", e))?;
            return Ok(Vec::new());
        }

        let mut loaded_ids = Vec::new();

        let entries = std::fs::read_dir(&self.plugins_dir)
            .map_err(|e| format!("Failed to read plugins directory: {}", e))?;

        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            let manifest_path = path.join("manifest.json");
            if !manifest_path.exists() {
                continue;
            }

            match self.load_plugin(&path) {
                Ok(id) => loaded_ids.push(id),
                Err(e) => eprintln!("Failed to load plugin at {}: {}", path.display(), e),
            }
        }

        Ok(loaded_ids)
    }

    fn load_plugin(&self, plugin_dir: &PathBuf) -> Result<String, String> {
        let manifest_path = plugin_dir.join("manifest.json");
        let manifest = PluginManifest::from_file(&manifest_path)?;

        let wasm_path = plugin_dir.join(&manifest.entry);
        if !wasm_path.exists() {
            return Err(format!("WASM entry file not found: {}", wasm_path.display()));
        }

        let wasm_bytes = std::fs::read(&wasm_path)
            .map_err(|e| format!("Failed to read WASM file: {}", e))?;

        let plugin_id = manifest.id.clone();

        let loaded = LoadedPlugin {
            manifest,
            path: plugin_dir.clone(),
            wasm_bytes,
            enabled: true,
        };

        let mut plugins = self.plugins.write();
        plugins.insert(plugin_id.clone(), loaded);

        Ok(plugin_id)
    }

    pub fn get_plugin(&self, id: &str) -> Option<LoadedPlugin> {
        let plugins = self.plugins.read();
        plugins.get(id).cloned()
    }

    pub fn list_plugins(&self) -> Vec<PluginInfo> {
        let plugins = self.plugins.read();
        plugins.values().map(|p| PluginInfo {
            id: p.manifest.id.clone(),
            name: p.manifest.name.clone(),
            version: p.manifest.version.clone(),
            author: p.manifest.author.clone(),
            description: p.manifest.description.clone(),
            permissions: p.manifest.permissions.iter().map(|perm| format!("{:?}", perm)).collect(),
            entry: p.manifest.entry.clone(),
            enabled: p.enabled,
        }).collect()
    }

    pub fn enable_plugin(&self, id: &str) -> Result<(), String> {
        let mut plugins = self.plugins.write();
        if let Some(plugin) = plugins.get_mut(id) {
            plugin.enabled = true;
            Ok(())
        } else {
            Err(format!("Plugin not found: {}", id))
        }
    }

    pub fn disable_plugin(&self, id: &str) -> Result<(), String> {
        let mut plugins = self.plugins.write();
        if let Some(plugin) = plugins.get_mut(id) {
            plugin.enabled = false;
            Ok(())
        } else {
            Err(format!("Plugin not found: {}", id))
        }
    }

    pub fn uninstall_plugin(&self, id: &str) -> Result<(), String> {
        let mut plugins = self.plugins.write();
        if let Some(plugin) = plugins.remove(id) {
            std::fs::remove_dir_all(&plugin.path)
                .map_err(|e| format!("Failed to remove plugin directory: {}", e))?;
            Ok(())
        } else {
            Err(format!("Plugin not found: {}", id))
        }
    }

    pub fn plugins_dir(&self) -> &PathBuf {
        &self.plugins_dir
    }
}
