pub struct AppConfig {
    pub web_app_url: String,
    pub api_url: String,
}

impl AppConfig {
    pub fn load() -> Self {
        // Use compile-time environment variables with fallback to defaults
        // These are set during the build process in CI/CD
        let web_app_url = option_env!("LAUNCHER_WEB_URL")
            .unwrap_or("http://localhost:3000")
            .to_string();
        let api_url = option_env!("LAUNCHER_API_URL")
            .unwrap_or("http://localhost:3001")
            .to_string();

        Self {
            web_app_url,
            api_url,
        }
    }

    pub fn plugins_api_url(&self) -> String {
        format!("{}/api/plugins", self.api_url)
    }
}

lazy_static::lazy_static! {
    pub static ref CONFIG: AppConfig = AppConfig::load();
}
