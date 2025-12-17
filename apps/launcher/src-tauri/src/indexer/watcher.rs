use notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, DebouncedEvent, Debouncer};
use parking_lot::Mutex;
use std::path::PathBuf;
use std::sync::mpsc::{channel, Receiver};
use std::sync::Arc;
use std::time::Duration;

pub struct FileWatcher {
    _debouncer: Debouncer<RecommendedWatcher>,
    pending_paths: Arc<Mutex<Vec<PathBuf>>>,
}

impl FileWatcher {
    pub fn new(paths: Vec<PathBuf>) -> Result<Self, String> {
        let pending_paths = Arc::new(Mutex::new(Vec::new()));
        let pending_clone = pending_paths.clone();

        let (tx, rx) = channel();

        std::thread::spawn(move || {
            Self::receiver_thread(rx, pending_clone);
        });

        let mut debouncer =
            new_debouncer(Duration::from_millis(500), tx).map_err(|e| e.to_string())?;

        for path in paths {
            if path.exists() {
                debouncer
                    .watcher()
                    .watch(&path, RecursiveMode::Recursive)
                    .map_err(|e| format!("Failed to watch {}: {}", path.display(), e))?;
            }
        }

        Ok(Self {
            _debouncer: debouncer,
            pending_paths,
        })
    }

    fn receiver_thread(
        receiver: Receiver<Result<Vec<DebouncedEvent>, notify::Error>>,
        pending_paths: Arc<Mutex<Vec<PathBuf>>>,
    ) {
        loop {
            match receiver.recv() {
                Ok(Ok(events)) => {
                    let mut lock = pending_paths.lock();
                    for event in events {
                        lock.push(event.path);
                    }
                }
                Ok(Err(e)) => {
                    eprintln!("Watcher error: {}", e);
                }
                Err(_) => {
                    break;
                }
            }
        }
    }

    pub fn poll_events(&self) -> Vec<PathBuf> {
        let mut lock = self.pending_paths.lock();
        let mut paths = std::mem::take(&mut *lock);
        paths.sort();
        paths.dedup();
        paths
    }
}
