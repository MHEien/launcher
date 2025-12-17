use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthProviderConfig {
    pub id: String,
    pub name: String,
    pub auth_url: String,
    pub token_url: String,
    pub scopes: Vec<String>,
    pub client_id: Option<String>,
    pub client_secret: Option<String>,
}

pub trait OAuthProvider: Send + Sync {
    fn id(&self) -> &str;
    fn name(&self) -> &str;
    fn config(&self) -> &OAuthProviderConfig;
    fn default_scopes(&self) -> Vec<String>;
}

pub struct GitHubProvider {
    config: OAuthProviderConfig,
}

impl GitHubProvider {
    pub fn new(client_id: Option<String>, client_secret: Option<String>) -> Self {
        Self {
            config: OAuthProviderConfig {
                id: "github".to_string(),
                name: "GitHub".to_string(),
                auth_url: "https://github.com/login/oauth/authorize".to_string(),
                token_url: "https://github.com/login/oauth/access_token".to_string(),
                scopes: vec!["repo".to_string(), "user".to_string()],
                client_id,
                client_secret,
            },
        }
    }
}

impl OAuthProvider for GitHubProvider {
    fn id(&self) -> &str {
        &self.config.id
    }

    fn name(&self) -> &str {
        &self.config.name
    }

    fn config(&self) -> &OAuthProviderConfig {
        &self.config
    }

    fn default_scopes(&self) -> Vec<String> {
        vec!["repo".to_string(), "user".to_string()]
    }
}

pub struct GoogleProvider {
    config: OAuthProviderConfig,
}

impl GoogleProvider {
    pub fn new(client_id: Option<String>, client_secret: Option<String>) -> Self {
        Self {
            config: OAuthProviderConfig {
                id: "google".to_string(),
                name: "Google".to_string(),
                auth_url: "https://accounts.google.com/o/oauth2/v2/auth".to_string(),
                token_url: "https://oauth2.googleapis.com/token".to_string(),
                scopes: vec![
                    "https://www.googleapis.com/auth/drive.readonly".to_string(),
                    "https://www.googleapis.com/auth/calendar.readonly".to_string(),
                ],
                client_id,
                client_secret,
            },
        }
    }
}

impl OAuthProvider for GoogleProvider {
    fn id(&self) -> &str {
        &self.config.id
    }

    fn name(&self) -> &str {
        &self.config.name
    }

    fn config(&self) -> &OAuthProviderConfig {
        &self.config
    }

    fn default_scopes(&self) -> Vec<String> {
        vec![
            "https://www.googleapis.com/auth/drive.readonly".to_string(),
            "https://www.googleapis.com/auth/calendar.readonly".to_string(),
        ]
    }
}

pub struct NotionProvider {
    config: OAuthProviderConfig,
}

impl NotionProvider {
    pub fn new(client_id: Option<String>, client_secret: Option<String>) -> Self {
        Self {
            config: OAuthProviderConfig {
                id: "notion".to_string(),
                name: "Notion".to_string(),
                auth_url: "https://api.notion.com/v1/oauth/authorize".to_string(),
                token_url: "https://api.notion.com/v1/oauth/token".to_string(),
                scopes: vec![], // Notion doesn't use scopes in the same way
                client_id,
                client_secret,
            },
        }
    }
}

impl OAuthProvider for NotionProvider {
    fn id(&self) -> &str {
        &self.config.id
    }

    fn name(&self) -> &str {
        &self.config.name
    }

    fn config(&self) -> &OAuthProviderConfig {
        &self.config
    }

    fn default_scopes(&self) -> Vec<String> {
        vec![] // Notion uses integration capabilities instead of scopes
    }
}

pub struct SlackProvider {
    config: OAuthProviderConfig,
}

impl SlackProvider {
    pub fn new(client_id: Option<String>, client_secret: Option<String>) -> Self {
        Self {
            config: OAuthProviderConfig {
                id: "slack".to_string(),
                name: "Slack".to_string(),
                auth_url: "https://slack.com/oauth/v2/authorize".to_string(),
                token_url: "https://slack.com/api/oauth.v2.access".to_string(),
                scopes: vec![
                    "channels:read".to_string(),
                    "search:read".to_string(),
                    "users:read".to_string(),
                ],
                client_id,
                client_secret,
            },
        }
    }
}

impl OAuthProvider for SlackProvider {
    fn id(&self) -> &str {
        &self.config.id
    }

    fn name(&self) -> &str {
        &self.config.name
    }

    fn config(&self) -> &OAuthProviderConfig {
        &self.config
    }

    fn default_scopes(&self) -> Vec<String> {
        vec![
            "channels:read".to_string(),
            "search:read".to_string(),
            "users:read".to_string(),
        ]
    }
}

pub static GITHUB_PROVIDER: &str = "github";
pub static GOOGLE_PROVIDER: &str = "google";
pub static NOTION_PROVIDER: &str = "notion";
pub static SLACK_PROVIDER: &str = "slack";
