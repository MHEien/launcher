use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexConfig {
    pub index_paths: Vec<PathBuf>,
    pub exclude_patterns: Vec<String>,
    pub exclude_hidden: bool,
    pub max_file_size_mb: u64,
    pub index_content: bool,
    pub content_extensions: Vec<String>,
}

impl Default for IndexConfig {
    fn default() -> Self {
        let mut index_paths = Vec::new();

        if let Some(home) = dirs::home_dir() {
            index_paths.push(home.join("Documents"));
            index_paths.push(home.join("Downloads"));
            index_paths.push(home.join("Desktop"));
            index_paths.push(home.join("Projects"));
            index_paths.push(home.join("Development"));
        }

        Self {
            index_paths,
            exclude_patterns: vec![
                "node_modules".to_string(),
                ".git".to_string(),
                ".cache".to_string(),
                "__pycache__".to_string(),
                "target".to_string(),
                ".venv".to_string(),
                "venv".to_string(),
                ".npm".to_string(),
                "dist".to_string(),
                "build".to_string(),
                ".cargo".to_string(),
                ".rustup".to_string(),
            ],
            exclude_hidden: true,
            max_file_size_mb: 10,
            index_content: true,
            content_extensions: vec![
                "txt".to_string(),
                "md".to_string(),
                "rs".to_string(),
                "py".to_string(),
                "js".to_string(),
                "ts".to_string(),
                "tsx".to_string(),
                "jsx".to_string(),
                "json".to_string(),
                "yaml".to_string(),
                "yml".to_string(),
                "toml".to_string(),
                "html".to_string(),
                "css".to_string(),
                "sh".to_string(),
                "bash".to_string(),
                "zsh".to_string(),
            ],
        }
    }
}

impl IndexConfig {
    /// Returns the path to the config file
    fn config_path() -> PathBuf {
        dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("launcher")
            .join("index_config.json")
    }

    /// Load config from disk, or return default if not found
    pub fn load() -> Self {
        let path = Self::config_path();
        if path.exists() {
            match fs::read_to_string(&path) {
                Ok(contents) => {
                    match serde_json::from_str(&contents) {
                        Ok(config) => return config,
                        Err(e) => eprintln!("Failed to parse index config: {}", e),
                    }
                }
                Err(e) => eprintln!("Failed to read index config: {}", e),
            }
        }
        Self::default()
    }

    /// Save config to disk
    pub fn save(&self) -> Result<(), String> {
        let path = Self::config_path();
        
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        
        let contents = serde_json::to_string_pretty(self)
            .map_err(|e| e.to_string())?;
        fs::write(&path, contents).map_err(|e| e.to_string())?;
        
        Ok(())
    }

    pub fn should_exclude(&self, path: &std::path::Path) -> bool {
        let path_str = path.to_string_lossy();

        if self.exclude_hidden {
            if let Some(name) = path.file_name() {
                if name.to_string_lossy().starts_with('.') {
                    return true;
                }
            }
        }

        for pattern in &self.exclude_patterns {
            if path_str.contains(pattern) {
                return true;
            }
        }

        false
    }

    pub fn should_index_content(&self, path: &std::path::Path) -> bool {
        if !self.index_content {
            return false;
        }

        if let Some(ext) = path.extension() {
            let ext_str = ext.to_string_lossy().to_lowercase();
            return self.content_extensions.contains(&ext_str);
        }

        false
    }
}
