use super::{ResultCategory, ResultIcon, SearchProvider, SearchResult};
use crate::indexer::{FileIndexer, FileWatcher, IndexConfig};
use parking_lot::{Mutex, RwLock};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

pub struct FileProvider {
    indexer: Arc<RwLock<Option<FileIndexer>>>,
    watcher: Arc<Mutex<Option<FileWatcher>>>,
    config: Arc<RwLock<Option<IndexConfig>>>,
    watcher_running: Arc<AtomicBool>,
}

impl FileProvider {
    pub fn new() -> Self {
        Self {
            indexer: Arc::new(RwLock::new(None)),
            watcher: Arc::new(Mutex::new(None)),
            config: Arc::new(RwLock::new(None)),
            watcher_running: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn get_config(&self) -> IndexConfig {
        self.config.read().clone().unwrap_or_default()
    }

    pub fn set_config(&self, config: IndexConfig) {
        let mut lock = self.config.write();
        *lock = Some(config);
    }

    pub fn initialize(&self) -> Result<usize, String> {
        let config = IndexConfig::load();

        let index_dir = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("launcher")
            .join("index");

        let indexer = FileIndexer::new(index_dir, config.clone())?;
        let count = indexer.index_all()?;

        {
            let mut lock = self.indexer.write();
            *lock = Some(indexer);
        }

        {
            let mut lock = self.config.write();
            *lock = Some(config);
        }

        Ok(count)
    }

    pub fn start_watcher(&self) -> Result<(), String> {
        let config = self.config.read();
        let config = config.as_ref().ok_or("Config not initialized")?;

        let watcher = FileWatcher::new(config.index_paths.clone())?;

        {
            let mut lock = self.watcher.lock();
            *lock = Some(watcher);
        }

        self.watcher_running.store(true, Ordering::SeqCst);
        Ok(())
    }

    pub fn process_watcher_events(&self) -> usize {
        if !self.watcher_running.load(Ordering::SeqCst) {
            return 0;
        }

        let changed_paths = {
            let watcher_lock = self.watcher.lock();
            match watcher_lock.as_ref() {
                Some(w) => w.poll_events(),
                None => return 0,
            }
        };

        if changed_paths.is_empty() {
            return 0;
        }

        let config_lock = self.config.read();
        let config = match config_lock.as_ref() {
            Some(c) => c,
            None => return 0,
        };

        let indexer_lock = self.indexer.read();
        let indexer = match indexer_lock.as_ref() {
            Some(i) => i,
            None => return 0,
        };

        let mut updated = 0;
        for path in &changed_paths {
            if config.should_exclude(path) {
                continue;
            }

            if let Err(e) = indexer.update_file(path) {
                eprintln!("Failed to update index for {}: {}", path.display(), e);
            } else {
                updated += 1;
            }
        }

        if updated > 0 {
            let _ = indexer.commit();
        }

        updated
    }

    pub fn is_initialized(&self) -> bool {
        self.indexer.read().is_some()
    }

    pub fn reindex(&self) -> Result<usize, String> {
        let lock = self.indexer.read();
        if let Some(indexer) = lock.as_ref() {
            indexer.index_all()
        } else {
            Err("Indexer not initialized".to_string())
        }
    }

    pub fn update_file(&self, path: &std::path::Path) -> Result<(), String> {
        let lock = self.indexer.read();
        if let Some(indexer) = lock.as_ref() {
            indexer.update_file(path)?;
            indexer.commit()?;
        }
        Ok(())
    }

    fn get_file_icon(extension: &Option<String>, is_dir: bool) -> ResultIcon {
        if is_dir {
            return ResultIcon::Emoji("📁".to_string());
        }

        let emoji = match extension.as_deref() {
            Some("rs") => "🦀",
            Some("py") => "🐍",
            Some("js") | Some("ts") | Some("jsx") | Some("tsx") => "📜",
            Some("html") => "🌐",
            Some("css") | Some("scss") | Some("sass") => "🎨",
            Some("json") | Some("yaml") | Some("yml") | Some("toml") => "⚙️",
            Some("md") | Some("txt") => "📝",
            Some("pdf") => "📕",
            Some("png") | Some("jpg") | Some("jpeg") | Some("gif") | Some("svg") | Some("webp") => "🖼️",
            Some("mp3") | Some("wav") | Some("flac") | Some("ogg") => "🎵",
            Some("mp4") | Some("mkv") | Some("avi") | Some("mov") => "🎬",
            Some("zip") | Some("tar") | Some("gz") | Some("7z") | Some("rar") => "📦",
            Some("sh") | Some("bash") | Some("zsh") => "💻",
            Some("go") => "🐹",
            Some("java") | Some("kt") => "☕",
            Some("c") | Some("cpp") | Some("h") | Some("hpp") => "⚡",
            Some("sql") | Some("db") => "🗃️",
            _ => "📄",
        };

        ResultIcon::Emoji(emoji.to_string())
    }

    fn format_size(size: u64) -> String {
        const KB: u64 = 1024;
        const MB: u64 = KB * 1024;
        const GB: u64 = MB * 1024;

        if size >= GB {
            format!("{:.1} GB", size as f64 / GB as f64)
        } else if size >= MB {
            format!("{:.1} MB", size as f64 / MB as f64)
        } else if size >= KB {
            format!("{:.1} KB", size as f64 / KB as f64)
        } else {
            format!("{} B", size)
        }
    }
}

impl SearchProvider for FileProvider {
    fn id(&self) -> &str {
        "files"
    }

    fn search(&self, query: &str) -> Vec<SearchResult> {
        if query.trim().len() < 2 {
            return vec![];
        }

        let lock = self.indexer.read();
        let indexer = match lock.as_ref() {
            Some(i) => i,
            None => return vec![],
        };

        let files = match indexer.fuzzy_search(query, 15) {
            Ok(f) => f,
            Err(_) => return vec![],
        };

        files
            .into_iter()
            .enumerate()
            .map(|(idx, file)| {
                let subtitle = if file.is_dir {
                    file.path.clone()
                } else {
                    format!("{} • {}", Self::format_size(file.size), file.path)
                };

                SearchResult {
                    id: format!("file:{}", file.path),
                    title: file.name,
                    subtitle: Some(subtitle),
                    icon: Self::get_file_icon(&file.extension, file.is_dir),
                    category: ResultCategory::File,
                    score: 50.0 - (idx as f32 * 0.5),
                }
            })
            .collect()
    }

    fn execute(&self, result_id: &str) -> Result<(), String> {
        if let Some(path) = result_id.strip_prefix("file:") {
            let path = std::path::Path::new(path);

            if path.is_dir() {
                #[cfg(target_os = "linux")]
                {
                    std::process::Command::new("xdg-open")
                        .arg(path)
                        .spawn()
                        .map_err(|e| e.to_string())?;
                }

                #[cfg(target_os = "macos")]
                {
                    std::process::Command::new("open")
                        .arg(path)
                        .spawn()
                        .map_err(|e| e.to_string())?;
                }

                #[cfg(target_os = "windows")]
                {
                    std::process::Command::new("explorer")
                        .arg(path)
                        .spawn()
                        .map_err(|e| e.to_string())?;
                }
            } else {
                #[cfg(target_os = "linux")]
                {
                    std::process::Command::new("xdg-open")
                        .arg(path)
                        .spawn()
                        .map_err(|e| e.to_string())?;
                }

                #[cfg(target_os = "macos")]
                {
                    std::process::Command::new("open")
                        .arg(path)
                        .spawn()
                        .map_err(|e| e.to_string())?;
                }

                #[cfg(target_os = "windows")]
                {
                    std::process::Command::new("cmd")
                        .args(["/C", "start", "", &path.to_string_lossy()])
                        .spawn()
                        .map_err(|e| e.to_string())?;
                }
            }

            Ok(())
        } else {
            Err("Invalid file result".to_string())
        }
    }
}
