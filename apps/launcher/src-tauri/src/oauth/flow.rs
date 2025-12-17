use super::providers::OAuthProviderConfig;
use super::storage::{OAuthToken, TokenStorage};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::Rng;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use url::Url;

#[derive(Debug, Clone)]
pub struct PendingAuth {
    pub provider: String,
    pub state: String,
    pub code_verifier: String,
    pub redirect_uri: String,
}

pub struct OAuthFlow {
    storage: Arc<TokenStorage>,
    pending: RwLock<HashMap<String, PendingAuth>>,
    providers: RwLock<HashMap<String, OAuthProviderConfig>>,
}

impl OAuthFlow {
    pub fn new(storage: Arc<TokenStorage>) -> Self {
        Self {
            storage,
            pending: RwLock::new(HashMap::new()),
            providers: RwLock::new(HashMap::new()),
        }
    }

    pub fn register_provider(&self, config: OAuthProviderConfig) {
        let mut providers = self.providers.write();
        providers.insert(config.id.clone(), config);
    }

    pub fn get_provider(&self, provider_id: &str) -> Option<OAuthProviderConfig> {
        let providers = self.providers.read();
        providers.get(provider_id).cloned()
    }

    pub fn list_providers(&self) -> Vec<OAuthProviderConfig> {
        let providers = self.providers.read();
        providers.values().cloned().collect()
    }

    pub fn update_provider_credentials(
        &self,
        provider_id: &str,
        client_id: Option<String>,
        client_secret: Option<String>,
    ) -> Result<(), String> {
        let mut providers = self.providers.write();
        let provider = providers
            .get_mut(provider_id)
            .ok_or_else(|| format!("Unknown provider: {}", provider_id))?;
        
        provider.client_id = client_id;
        provider.client_secret = client_secret;
        Ok(())
    }

    fn generate_state() -> String {
        let bytes: [u8; 32] = rand::thread_rng().gen();
        URL_SAFE_NO_PAD.encode(bytes)
    }

    fn generate_code_verifier() -> String {
        let bytes: [u8; 32] = rand::thread_rng().gen();
        URL_SAFE_NO_PAD.encode(bytes)
    }

    fn generate_code_challenge(verifier: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(verifier.as_bytes());
        let hash = hasher.finalize();
        URL_SAFE_NO_PAD.encode(hash)
    }

    pub fn start_auth(
        &self,
        provider_id: &str,
        scopes: Option<Vec<String>>,
        redirect_uri: &str,
    ) -> Result<String, String> {
        let provider = self
            .get_provider(provider_id)
            .ok_or_else(|| format!("Unknown provider: {}", provider_id))?;

        let client_id = provider
            .client_id
            .as_ref()
            .ok_or("Provider not configured: missing client_id")?;

        let state = Self::generate_state();
        let code_verifier = Self::generate_code_verifier();
        let code_challenge = Self::generate_code_challenge(&code_verifier);

        let scopes = scopes.unwrap_or(provider.scopes.clone());
        let scope_str = scopes.join(" ");

        let mut auth_url = Url::parse(&provider.auth_url)
            .map_err(|e| format!("Invalid auth URL: {}", e))?;

        auth_url.query_pairs_mut()
            .append_pair("client_id", client_id)
            .append_pair("redirect_uri", redirect_uri)
            .append_pair("response_type", "code")
            .append_pair("state", &state)
            .append_pair("scope", &scope_str)
            .append_pair("code_challenge", &code_challenge)
            .append_pair("code_challenge_method", "S256");

        let pending = PendingAuth {
            provider: provider_id.to_string(),
            state: state.clone(),
            code_verifier,
            redirect_uri: redirect_uri.to_string(),
        };

        {
            let mut pending_map = self.pending.write();
            pending_map.insert(state, pending);
        }

        Ok(auth_url.to_string())
    }

    pub async fn exchange_code(
        &self,
        state: &str,
        code: &str,
    ) -> Result<OAuthToken, String> {
        let pending = {
            let mut pending_map = self.pending.write();
            pending_map
                .remove(state)
                .ok_or("Invalid or expired state parameter")?
        };

        let provider = self
            .get_provider(&pending.provider)
            .ok_or("Provider not found")?;

        let client_id = provider
            .client_id
            .as_ref()
            .ok_or("Provider not configured: missing client_id")?;

        let client = reqwest::Client::new();

        let mut params = HashMap::new();
        params.insert("client_id", client_id.as_str());
        params.insert("code", code);
        params.insert("redirect_uri", &pending.redirect_uri);
        params.insert("grant_type", "authorization_code");
        params.insert("code_verifier", &pending.code_verifier);

        if let Some(ref secret) = provider.client_secret {
            params.insert("client_secret", secret.as_str());
        }

        let response = client
            .post(&provider.token_url)
            .header("Accept", "application/json")
            .form(&params)
            .send()
            .await
            .map_err(|e| format!("Token request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Token exchange failed: {}", error_text));
        }

        let token_response: TokenResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse token response: {}", e))?;

        let expires_at = token_response.expires_in.map(|secs| {
            chrono::Utc::now().timestamp() + secs as i64
        });

        let token = OAuthToken {
            access_token: token_response.access_token,
            refresh_token: token_response.refresh_token,
            token_type: token_response.token_type.unwrap_or_else(|| "Bearer".to_string()),
            expires_at,
            scopes: token_response
                .scope
                .map(|s| s.split_whitespace().map(String::from).collect())
                .unwrap_or_default(),
        };

        self.storage.store_token(&pending.provider, &token)?;

        Ok(token)
    }

    pub async fn refresh_token(&self, provider_id: &str) -> Result<OAuthToken, String> {
        let current_token = self
            .storage
            .get_token(provider_id)
            .ok_or("No token found for provider")?;

        let refresh_token = current_token
            .refresh_token
            .as_ref()
            .ok_or("No refresh token available")?;

        let provider = self
            .get_provider(provider_id)
            .ok_or("Provider not found")?;

        let client_id = provider
            .client_id
            .as_ref()
            .ok_or("Provider not configured")?;

        let client = reqwest::Client::new();

        let mut params = HashMap::new();
        params.insert("client_id", client_id.as_str());
        params.insert("refresh_token", refresh_token.as_str());
        params.insert("grant_type", "refresh_token");

        if let Some(ref secret) = provider.client_secret {
            params.insert("client_secret", secret.as_str());
        }

        let response = client
            .post(&provider.token_url)
            .header("Accept", "application/json")
            .form(&params)
            .send()
            .await
            .map_err(|e| format!("Refresh request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Token refresh failed: {}", error_text));
        }

        let token_response: TokenResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse token response: {}", e))?;

        let expires_at = token_response.expires_in.map(|secs| {
            chrono::Utc::now().timestamp() + secs as i64
        });

        let token = OAuthToken {
            access_token: token_response.access_token,
            refresh_token: token_response
                .refresh_token
                .or(current_token.refresh_token),
            token_type: token_response.token_type.unwrap_or_else(|| "Bearer".to_string()),
            expires_at,
            scopes: current_token.scopes,
        };

        self.storage.store_token(provider_id, &token)?;

        Ok(token)
    }

    pub async fn get_valid_token(&self, provider_id: &str) -> Result<String, String> {
        let token = self
            .storage
            .get_token(provider_id)
            .ok_or("Not authenticated with this provider")?;

        if token.is_expired() {
            let refreshed = self.refresh_token(provider_id).await?;
            Ok(refreshed.access_token)
        } else {
            Ok(token.access_token)
        }
    }

    pub fn disconnect(&self, provider_id: &str) -> Result<(), String> {
        self.storage.delete_token(provider_id)
    }

    pub fn is_connected(&self, provider_id: &str) -> bool {
        self.storage.has_token(provider_id)
    }

    pub fn get_token_if_valid(&self, provider_id: &str) -> Option<String> {
        let token = self.storage.get_token(provider_id)?;
        if !token.is_expired() {
            Some(token.access_token)
        } else {
            None
        }
    }
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    token_type: Option<String>,
    expires_in: Option<u64>,
    scope: Option<String>,
}
