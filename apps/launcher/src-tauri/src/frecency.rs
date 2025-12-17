use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

const HALF_LIFE_DAYS: f64 = 7.0;
const MAX_ENTRIES: usize = 1000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrecencyEntry {
    pub id: String,
    pub access_count: u32,
    pub last_access: DateTime<Utc>,
}

impl FrecencyEntry {
    pub fn new(id: String) -> Self {
        Self {
            id,
            access_count: 1,
            last_access: Utc::now(),
        }
    }

    pub fn record_access(&mut self) {
        self.access_count += 1;
        self.last_access = Utc::now();
    }

    pub fn score(&self) -> f64 {
        let days_since = (Utc::now() - self.last_access).num_hours() as f64 / 24.0;
        let recency_factor = (-days_since / HALF_LIFE_DAYS).exp();
        let frequency_factor = (self.access_count as f64).ln() + 1.0;
        recency_factor * frequency_factor * 10.0
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FrecencyData {
    pub entries: HashMap<String, FrecencyEntry>,
}

pub struct FrecencyStore {
    data: RwLock<FrecencyData>,
    path: PathBuf,
}

impl FrecencyStore {
    pub fn new() -> Self {
        let path = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("launcher")
            .join("frecency.json");

        let data = Self::load_from_file(&path).unwrap_or_default();

        Self {
            data: RwLock::new(data),
            path,
        }
    }

    fn load_from_file(path: &PathBuf) -> Option<FrecencyData> {
        let content = std::fs::read_to_string(path).ok()?;
        serde_json::from_str(&content).ok()
    }

    pub fn record_access(&self, id: &str) {
        let mut data = self.data.write();

        if let Some(entry) = data.entries.get_mut(id) {
            entry.record_access();
        } else {
            data.entries
                .insert(id.to_string(), FrecencyEntry::new(id.to_string()));
        }

        if data.entries.len() > MAX_ENTRIES {
            self.prune_old_entries(&mut data);
        }

        drop(data);
        self.save();
    }

    fn prune_old_entries(&self, data: &mut FrecencyData) {
        let mut entries: Vec<_> = data.entries.drain().collect();
        entries.sort_by(|a, b| {
            b.1.score()
                .partial_cmp(&a.1.score())
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        entries.truncate(MAX_ENTRIES / 2);
        data.entries = entries.into_iter().collect();
    }

    pub fn get_boost(&self, id: &str) -> f64 {
        let data = self.data.read();
        data.entries.get(id).map(|e| e.score()).unwrap_or(0.0)
    }

    pub fn save(&self) {
        let data = self.data.read();

        if let Some(parent) = self.path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        if let Ok(json) = serde_json::to_string_pretty(&*data) {
            let _ = std::fs::write(&self.path, json);
        }
    }

    pub fn get_top_results(&self, limit: usize) -> Vec<(String, f64)> {
        let data = self.data.read();
        let mut entries: Vec<_> = data
            .entries
            .iter()
            .map(|(id, entry)| (id.clone(), entry.score()))
            .collect();

        entries.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        entries.truncate(limit);
        entries
    }
}
