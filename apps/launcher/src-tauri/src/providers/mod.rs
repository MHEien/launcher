pub mod calculator;
pub mod apps;
pub mod files;
pub mod plugins;
pub mod github;
pub mod notion;
pub mod slack;
pub mod google_drive;
pub mod google_calendar;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub icon: ResultIcon,
    pub category: ResultCategory,
    pub score: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum ResultIcon {
    Text(String),
    Path(String),
    Emoji(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ResultCategory {
    Calculator,
    Application,
    File,
    Command,
    Plugin,
    GitHub,
}

pub trait SearchProvider: Send + Sync {
    fn id(&self) -> &str;
    fn search(&self, query: &str) -> Vec<SearchResult>;
    fn execute(&self, result_id: &str) -> Result<(), String>;
}
