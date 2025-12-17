use keyring::Entry;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const SERVICE_NAME: &str = "launcher-oauth";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthToken {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub token_type: String,
    pub expires_at: Option<i64>,
    pub scopes: Vec<String>,
}

impl OAuthToken {
    pub fn is_expired(&self) -> bool {
        if let Some(expires_at) = self.expires_at {
            let now = chrono::Utc::now().timestamp();
            now >= expires_at - 60
        } else {
            false
        }
    }
}

pub struct TokenStorage {
    cache: RwLock<HashMap<String, OAuthToken>>,
}

impl TokenStorage {
    pub fn new() -> Self {
        Self {
            cache: RwLock::new(HashMap::new()),
        }
    }

    fn keyring_key(provider: &str) -> String {
        format!("{}:{}", SERVICE_NAME, provider)
    }

    pub fn store_token(&self, provider: &str, token: &OAuthToken) -> Result<(), String> {
        let key = Self::keyring_key(provider);
        let json = serde_json::to_string(token)
            .map_err(|e| format!("Failed to serialize token: {}", e))?;

        let entry = Entry::new(SERVICE_NAME, &key)
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

        entry
            .set_password(&json)
            .map_err(|e| format!("Failed to store token in keyring: {}", e))?;

        let mut cache = self.cache.write();
        cache.insert(provider.to_string(), token.clone());

        Ok(())
    }

    pub fn get_token(&self, provider: &str) -> Option<OAuthToken> {
        {
            let cache = self.cache.read();
            if let Some(token) = cache.get(provider) {
                if !token.is_expired() {
                    return Some(token.clone());
                }
            }
        }

        let key = Self::keyring_key(provider);
        let entry = Entry::new(SERVICE_NAME, &key).ok()?;
        let json = entry.get_password().ok()?;
        let token: OAuthToken = serde_json::from_str(&json).ok()?;

        if !token.is_expired() {
            let mut cache = self.cache.write();
            cache.insert(provider.to_string(), token.clone());
            Some(token)
        } else if token.refresh_token.is_some() {
            Some(token)
        } else {
            None
        }
    }

    pub fn delete_token(&self, provider: &str) -> Result<(), String> {
        let key = Self::keyring_key(provider);

        if let Ok(entry) = Entry::new(SERVICE_NAME, &key) {
            let _ = entry.delete_credential();
        }

        let mut cache = self.cache.write();
        cache.remove(provider);

        Ok(())
    }

    pub fn has_token(&self, provider: &str) -> bool {
        self.get_token(provider).is_some()
    }

    pub fn list_connected_providers(&self) -> Vec<String> {
        let cache = self.cache.read();
        cache.keys().cloned().collect()
    }
}

impl Default for TokenStorage {
    fn default() -> Self {
        Self::new()
    }
}
