use super::host_api::{PluginHostApi, PluginSearchResult, HOST_API};
use super::manifest::LoadedPlugin;
use extism::{Manifest, Plugin, Wasm};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Plugin runtime using Extism for multi-language WASM support
pub struct PluginRuntime {
    instances: RwLock<HashMap<String, PluginInstance>>,
}

struct PluginInstance {
    plugin: Plugin,
    #[allow(dead_code)]
    plugin_id: String,
}

/// Input/output types for plugin communication
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchInput {
    pub query: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchOutput {
    pub results: Vec<PluginSearchResult>,
}

impl PluginRuntime {
    pub fn new() -> Result<Self, String> {
        Ok(Self {
            instances: RwLock::new(HashMap::new()),
        })
    }

    pub fn load_plugin(&self, plugin: &LoadedPlugin) -> Result<(), String> {
        // Create Extism manifest from WASM bytes
        let wasm = Wasm::data(plugin.wasm_bytes.clone());
        let manifest = Manifest::new([wasm]);

        // Create plugin instance
        // Note: Host functions will be added in a future update when Extism's
        // host function API is properly integrated
        let mut extism_plugin = Plugin::new(&manifest, [], true)
            .map_err(|e| format!("Failed to create Extism plugin: {}", e))?;

        // Call init if it exists
        if extism_plugin.function_exists("init") {
            match extism_plugin.call::<(), ()>("init", ()) {
                Ok(_) => {
                    HOST_API.log(
                        &plugin.manifest.id,
                        "info",
                        "Plugin initialized successfully",
                    );
                }
                Err(e) => {
                    HOST_API.log(
                        &plugin.manifest.id,
                        "warn",
                        &format!("Init failed (may not be implemented): {}", e),
                    );
                }
            }
        }

        let instance = PluginInstance {
            plugin: extism_plugin,
            plugin_id: plugin.manifest.id.clone(),
        };

        let mut instances = self.instances.write();
        instances.insert(plugin.manifest.id.clone(), instance);

        Ok(())
    }

    pub fn call_search(
        &self,
        plugin_id: &str,
        query: &str,
    ) -> Result<Vec<PluginSearchResult>, String> {
        let mut instances = self.instances.write();
        let instance = instances
            .get_mut(plugin_id)
            .ok_or_else(|| format!("Plugin not loaded: {}", plugin_id))?;

        // Check if search function exists
        if !instance.plugin.function_exists("search") {
            return Ok(vec![]);
        }

        // Call the search function with JSON input
        let input = SearchInput {
            query: query.to_string(),
        };

        let input_json = serde_json::to_string(&input)
            .map_err(|e| format!("Failed to serialize search input: {}", e))?;

        match instance.plugin.call::<&str, &str>("search", &input_json) {
            Ok(output_json) => {
                let output: SearchOutput = serde_json::from_str(output_json)
                    .map_err(|e| format!("Failed to parse search output: {}", e))?;
                Ok(output.results)
            }
            Err(e) => {
                HOST_API.log(plugin_id, "error", &format!("Search error: {}", e));
                Ok(vec![])
            }
        }
    }

    /// Call an AI tool function on a plugin
    pub fn call_ai_tool(&self, plugin_id: &str, tool_input_json: &str) -> Result<String, String> {
        let mut instances = self.instances.write();
        let instance = instances
            .get_mut(plugin_id)
            .ok_or_else(|| format!("Plugin not loaded: {}", plugin_id))?;

        // Check if execute_ai_tool function exists
        if !instance.plugin.function_exists("execute_ai_tool") {
            return Err(format!(
                "Plugin {} does not support AI tools (no execute_ai_tool function)",
                plugin_id
            ));
        }

        // Call the AI tool execution function
        match instance
            .plugin
            .call::<&str, &str>("execute_ai_tool", tool_input_json)
        {
            Ok(output_json) => {
                HOST_API.log(plugin_id, "info", &format!("AI tool executed successfully"));
                Ok(output_json.to_string())
            }
            Err(e) => {
                HOST_API.log(plugin_id, "error", &format!("AI tool error: {}", e));
                Err(format!("AI tool execution failed: {}", e))
            }
        }
    }

    pub fn unload_plugin(&self, plugin_id: &str) -> Result<(), String> {
        let mut instances = self.instances.write();

        if let Some(mut instance) = instances.remove(plugin_id) {
            // Call shutdown if it exists
            if instance.plugin.function_exists("shutdown") {
                let _ = instance.plugin.call::<(), ()>("shutdown", ());
            }
            HOST_API.log(plugin_id, "info", "Plugin unloaded");
        }

        Ok(())
    }

    pub fn is_loaded(&self, plugin_id: &str) -> bool {
        let instances = self.instances.read();
        instances.contains_key(plugin_id)
    }

    pub fn loaded_plugin_ids(&self) -> Vec<String> {
        let instances = self.instances.read();
        instances.keys().cloned().collect()
    }
}
