use serde::{Deserialize, Serialize};
use std::sync::Arc;
use parking_lot::RwLock;
use keyring::Entry;

const SERVICE_NAME: &str = "com.heien.launcher";
const AUTH_KEY: &str = "web_auth_session";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSession {
    pub user_id: String,
    pub email: Option<String>,
    pub name: Option<String>,
    pub avatar: Option<String>,
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthState {
    pub is_authenticated: bool,
    pub user: Option<UserInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: String,
    pub email: Option<String>,
    pub name: Option<String>,
    pub avatar: Option<String>,
}

pub struct WebAuth {
    web_app_url: String,
    session: RwLock<Option<UserSession>>,
    pending_token: RwLock<Option<String>>, // Track token being processed to prevent duplicates
}

impl WebAuth {
    pub fn new(web_app_url: &str) -> Self {
        let auth = Self {
            web_app_url: web_app_url.to_string(),
            session: RwLock::new(None),
            pending_token: RwLock::new(None),
        };
        
        // Try to load existing session from keyring
        if let Ok(session) = auth.load_session() {
            *auth.session.write() = Some(session);
        }
        
        auth
    }

    pub fn web_app_url(&self) -> &str {
        &self.web_app_url
    }

    pub fn get_login_url(&self) -> String {
        format!(
            "{}/auth/desktop?redirect_uri=launcher://auth/callback",
            self.web_app_url
        )
    }

    pub fn get_auth_state(&self) -> AuthState {
        let session = self.session.read();
        match session.as_ref() {
            Some(s) => AuthState {
                is_authenticated: true,
                user: Some(UserInfo {
                    id: s.user_id.clone(),
                    email: s.email.clone(),
                    name: s.name.clone(),
                    avatar: s.avatar.clone(),
                }),
            },
            None => AuthState {
                is_authenticated: false,
                user: None,
            },
        }
    }

    pub fn get_access_token(&self) -> Option<String> {
        let session = self.session.read();
        session.as_ref().map(|s| s.access_token.clone())
    }

    pub async fn handle_callback(&self, token: &str) -> Result<UserSession, String> {
        // Check if we're already processing this token (prevent duplicate calls)
        {
            let mut pending = self.pending_token.write();
            if pending.as_ref() == Some(&token.to_string()) {
                println!("[auth] Token already being processed, skipping duplicate");
                return Err("Token already being processed".to_string());
            }
            *pending = Some(token.to_string());
        }
        
        // Exchange the one-time token for a session
        println!("[auth] Exchanging token with web server at {}", self.web_app_url);
        let client = reqwest::Client::new();
        
        let response = client
            .post(&format!("{}/api/auth/desktop/exchange", self.web_app_url))
            .json(&serde_json::json!({ "token": token }))
            .send()
            .await
            .map_err(|e| format!("Failed to exchange token: {}", e))?;

        println!("[auth] Response status: {}", response.status());
        
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            println!("[auth] Error response: {}", error_text);
            return Err(format!("Token exchange failed: {}", error_text));
        }

        let session: UserSession = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse session: {}", e))?;

        // Store session
        self.save_session(&session)?;
        *self.session.write() = Some(session.clone());

        Ok(session)
    }

    pub fn logout(&self) -> Result<(), String> {
        *self.session.write() = None;
        self.delete_session()
    }

    fn save_session(&self, session: &UserSession) -> Result<(), String> {
        let entry = Entry::new(SERVICE_NAME, AUTH_KEY)
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
        
        let json = serde_json::to_string(session)
            .map_err(|e| format!("Failed to serialize session: {}", e))?;
        
        entry.set_password(&json)
            .map_err(|e| format!("Failed to save session: {}", e))?;
        
        Ok(())
    }

    fn load_session(&self) -> Result<UserSession, String> {
        let entry = Entry::new(SERVICE_NAME, AUTH_KEY)
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
        
        let json = entry.get_password()
            .map_err(|e| format!("Failed to load session: {}", e))?;
        
        let session: UserSession = serde_json::from_str(&json)
            .map_err(|e| format!("Failed to parse session: {}", e))?;
        
        // Check if session is expired
        if let Some(expires_at) = session.expires_at {
            let now = chrono::Utc::now().timestamp();
            if now > expires_at {
                self.delete_session().ok();
                return Err("Session expired".to_string());
            }
        }
        
        Ok(session)
    }

    fn delete_session(&self) -> Result<(), String> {
        let entry = Entry::new(SERVICE_NAME, AUTH_KEY)
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
        
        entry.delete_credential()
            .map_err(|e| format!("Failed to delete session: {}", e))?;
        
        Ok(())
    }

    pub async fn refresh_session(&self) -> Result<UserSession, String> {
        let current_session = {
            let session = self.session.read();
            session.clone().ok_or("No session to refresh")?
        };

        let refresh_token = current_session
            .refresh_token
            .as_ref()
            .ok_or("No refresh token available")?;

        let client = reqwest::Client::new();
        
        let response = client
            .post(&format!("{}/api/auth/desktop/refresh", self.web_app_url))
            .json(&serde_json::json!({ "refresh_token": refresh_token }))
            .send()
            .await
            .map_err(|e| format!("Failed to refresh session: {}", e))?;

        if !response.status().is_success() {
            // Session invalid, clear it
            self.logout().ok();
            return Err("Session refresh failed, please log in again".to_string());
        }

        let session: UserSession = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse session: {}", e))?;

        self.save_session(&session)?;
        *self.session.write() = Some(session.clone());

        Ok(session)
    }
}
