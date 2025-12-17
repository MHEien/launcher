pub mod config;
pub mod file_index;
pub mod watcher;

pub use config::IndexConfig;
pub use file_index::{FileIndexer, IndexStats, IndexedFile};
pub use watcher::FileWatcher;
