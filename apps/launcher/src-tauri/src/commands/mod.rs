use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Represents a command that can be triggered with a prefix (e.g., "codex:", "git:")
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Command {
    /// Unique identifier for the command
    pub id: String,
    /// The trigger prefix (without colon), e.g., "codex", "git", "ai"
    pub trigger: String,
    /// Display name for the command
    pub name: String,
    /// Description of what the command does
    pub description: String,
    /// Icon (emoji or icon name)
    pub icon: Option<String>,
    /// Source of the command (built-in or plugin id)
    pub source: CommandSource,
    /// Whether this command is currently enabled
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CommandSource {
    /// Built-in command
    BuiltIn,
    /// Plugin-provided command
    Plugin(String),
}

/// Registry that stores and manages all available commands
pub struct CommandRegistry {
    commands: RwLock<HashMap<String, Command>>,
}

impl CommandRegistry {
    pub fn new() -> Self {
        let registry = Self {
            commands: RwLock::new(HashMap::new()),
        };
        registry.register_builtin_commands();
        registry
    }

    /// Register built-in commands
    fn register_builtin_commands(&self) {
        let builtins = vec![
            Command {
                id: "builtin:codex".to_string(),
                trigger: "codex".to_string(),
                name: "Codex CLI".to_string(),
                description: "AI-powered coding assistant by OpenAI".to_string(),
                icon: Some("🤖".to_string()),
                source: CommandSource::BuiltIn,
                enabled: true,
            },
            Command {
                id: "builtin:ai".to_string(),
                trigger: "ai".to_string(),
                name: "AI Assistant".to_string(),
                description: "Ask AI anything".to_string(),
                icon: Some("✨".to_string()),
                source: CommandSource::BuiltIn,
                enabled: true,
            },
            Command {
                id: "builtin:settings".to_string(),
                trigger: "settings".to_string(),
                name: "Settings".to_string(),
                description: "Open launcher settings".to_string(),
                icon: Some("⚙️".to_string()),
                source: CommandSource::BuiltIn,
                enabled: true,
            },
            Command {
                id: "builtin:theme".to_string(),
                trigger: "theme".to_string(),
                name: "Theme".to_string(),
                description: "Change launcher theme".to_string(),
                icon: Some("🎨".to_string()),
                source: CommandSource::BuiltIn,
                enabled: true,
            },
            Command {
                id: "builtin:reload".to_string(),
                trigger: "reload".to_string(),
                name: "Reload".to_string(),
                description: "Reload the launcher and re-index files".to_string(),
                icon: Some("🔄".to_string()),
                source: CommandSource::BuiltIn,
                enabled: true,
            },
            Command {
                id: "builtin:plugins".to_string(),
                trigger: "plugins".to_string(),
                name: "Plugins".to_string(),
                description: "Manage installed plugins".to_string(),
                icon: Some("🧩".to_string()),
                source: CommandSource::BuiltIn,
                enabled: true,
            },
            Command {
                id: "builtin:quit".to_string(),
                trigger: "quit".to_string(),
                name: "Quit".to_string(),
                description: "Quit the launcher application".to_string(),
                icon: Some("🚪".to_string()),
                source: CommandSource::BuiltIn,
                enabled: true,
            },
        ];

        let mut commands = self.commands.write();
        for cmd in builtins {
            commands.insert(cmd.id.clone(), cmd);
        }
    }

    /// Register a command from a plugin
    pub fn register_plugin_command(
        &self,
        plugin_id: &str,
        trigger: &str,
        name: &str,
        description: &str,
        icon: Option<String>,
    ) {
        let id = format!("plugin:{}:{}", plugin_id, trigger);
        let command = Command {
            id: id.clone(),
            trigger: trigger.to_string(),
            name: name.to_string(),
            description: description.to_string(),
            icon,
            source: CommandSource::Plugin(plugin_id.to_string()),
            enabled: true,
        };

        let mut commands = self.commands.write();
        commands.insert(id, command);
    }

    /// Unregister all commands from a plugin
    pub fn unregister_plugin_commands(&self, plugin_id: &str) {
        let mut commands = self.commands.write();
        commands.retain(|_, cmd| {
            if let CommandSource::Plugin(pid) = &cmd.source {
                pid != plugin_id
            } else {
                true
            }
        });
    }

    /// Get all registered commands
    pub fn get_all_commands(&self) -> Vec<Command> {
        let commands = self.commands.read();
        commands.values().filter(|c| c.enabled).cloned().collect()
    }

    /// Find commands matching a query (fuzzy match on trigger, name, description)
    pub fn search_commands(&self, query: &str) -> Vec<Command> {
        use strsim::jaro_winkler;

        let query_lower = query.to_lowercase();
        let commands = self.commands.read();

        let mut results: Vec<(Command, f32)> = commands
            .values()
            .filter(|c| c.enabled)
            .filter_map(|cmd| {
                let trigger_lower = cmd.trigger.to_lowercase();
                let name_lower = cmd.name.to_lowercase();
                let desc_lower = cmd.description.to_lowercase();

                // Exact trigger match
                if trigger_lower == query_lower {
                    return Some((cmd.clone(), 100.0));
                }

                // Trigger starts with query
                if trigger_lower.starts_with(&query_lower) {
                    return Some((cmd.clone(), 90.0));
                }

                // Name starts with query
                if name_lower.starts_with(&query_lower) {
                    return Some((cmd.clone(), 80.0));
                }

                // Trigger contains query
                if trigger_lower.contains(&query_lower) {
                    return Some((cmd.clone(), 70.0));
                }

                // Name contains query
                if name_lower.contains(&query_lower) {
                    return Some((cmd.clone(), 60.0));
                }

                // Fuzzy match on trigger using Jaro-Winkler
                let trigger_jw = jaro_winkler(&query_lower, &trigger_lower) as f32;
                if trigger_jw > 0.8 {
                    return Some((cmd.clone(), 50.0 + (trigger_jw - 0.8) * 50.0));
                }

                // Fuzzy match on name
                let name_jw = jaro_winkler(&query_lower, &name_lower) as f32;
                if name_jw > 0.8 {
                    return Some((cmd.clone(), 40.0 + (name_jw - 0.8) * 50.0));
                }

                // Description contains query
                if desc_lower.contains(&query_lower) {
                    return Some((cmd.clone(), 30.0));
                }

                None
            })
            .collect();

        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        results.into_iter().map(|(cmd, _)| cmd).collect()
    }

    /// Check if query matches a command trigger exactly (e.g., "codex:" -> Some(Command))
    pub fn match_trigger(&self, query: &str) -> Option<Command> {
        // Check if query is or starts with "trigger:"
        let trigger = if query.ends_with(':') {
            &query[..query.len() - 1]
        } else if let Some(pos) = query.find(':') {
            &query[..pos]
        } else {
            return None;
        };

        let trigger_lower = trigger.to_lowercase();
        let commands = self.commands.read();

        commands
            .values()
            .find(|cmd| cmd.enabled && cmd.trigger.to_lowercase() == trigger_lower)
            .cloned()
    }

    /// Get a command by its trigger
    pub fn get_by_trigger(&self, trigger: &str) -> Option<Command> {
        let trigger_lower = trigger.to_lowercase();
        let commands = self.commands.read();

        commands
            .values()
            .find(|cmd| cmd.enabled && cmd.trigger.to_lowercase() == trigger_lower)
            .cloned()
    }

    /// Enable or disable a command
    pub fn set_command_enabled(&self, command_id: &str, enabled: bool) {
        let mut commands = self.commands.write();
        if let Some(cmd) = commands.get_mut(command_id) {
            cmd.enabled = enabled;
        }
    }
}

impl Default for CommandRegistry {
    fn default() -> Self {
        Self::new()
    }
}

