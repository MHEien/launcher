use super::{ResultCategory, ResultIcon, SearchProvider, SearchResult};
use crate::plugins::{PluginLoader, PluginRuntime};
use std::sync::Arc;

pub struct PluginProvider {
    loader: Arc<PluginLoader>,
    runtime: Arc<PluginRuntime>,
}

impl PluginProvider {
    pub fn new(loader: Arc<PluginLoader>, runtime: Arc<PluginRuntime>) -> Self {
        Self { loader, runtime }
    }
}

impl SearchProvider for PluginProvider {
    fn id(&self) -> &str {
        "plugins"
    }

    fn search(&self, query: &str) -> Vec<SearchResult> {
        if query.is_empty() {
            return vec![];
        }

        let mut results = Vec::new();
        let plugin_ids = self.runtime.loaded_plugin_ids();

        for plugin_id in plugin_ids {
            if let Some(plugin) = self.loader.get_plugin(&plugin_id) {
                if !plugin.enabled {
                    continue;
                }

                match self.runtime.call_search(&plugin_id, query) {
                    Ok(plugin_results) => {
                        for pr in plugin_results {
                            results.push(SearchResult {
                                id: format!("plugin:{}:{}", plugin_id, pr.id),
                                title: pr.title,
                                subtitle: pr.subtitle,
                                icon: pr
                                    .icon
                                    .map(|i| ResultIcon::Emoji(i))
                                    .unwrap_or(ResultIcon::Emoji("🔌".to_string())),
                                category: ResultCategory::Plugin,
                                score: 50.0,
                            });
                        }
                    }
                    Err(e) => {
                        eprintln!("Plugin {} search error: {}", plugin_id, e);
                    }
                }
            }
        }

        results
    }

    fn execute(&self, result_id: &str) -> Result<(), String> {
        let parts: Vec<&str> = result_id.splitn(3, ':').collect();
        if parts.len() < 3 || parts[0] != "plugin" {
            return Err("Invalid plugin result ID".to_string());
        }

        let _plugin_id = parts[1];
        let _action_id = parts[2];

        Ok(())
    }
}
