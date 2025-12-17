use std::env;

pub struct AppConfig {
    pub web_app_url: String,
    pub api_url: String,
}

impl AppConfig {
    pub fn load() -> Self {
        Self {
            web_app_url: env::var("LAUNCHER_WEB_URL")
                .unwrap_or_else(|_| "http://localhost:3000".to_string()),
            api_url: env::var("LAUNCHER_API_URL")
                .unwrap_or_else(|_| "http://localhost:3001".to_string()),
        }
    }

    pub fn plugins_api_url(&self) -> String {
        format!("{}/api/plugins", self.api_url)
    }
}

lazy_static::lazy_static! {
    pub static ref CONFIG: AppConfig = AppConfig::load();
}
