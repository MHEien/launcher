pub mod auth;
pub mod installer;
pub mod session;

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

pub use auth::CodexAuth;
pub use installer::{BunInstallStatus, CodexInstaller};
pub use session::{CodexSession, SessionInfo, SessionMessage};

/// Status of Codex CLI installation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status")]
pub enum CodexStatus {
    /// Codex is installed and ready
    Installed { version: String },
    /// Codex is not installed
    NotInstalled,
    /// Currently checking installation status
    Checking,
    /// Currently installing
    Installing { progress: String },
    /// Installation failed
    InstallFailed { error: String },
}

/// Authentication status for Codex
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status")]
pub enum CodexAuthStatus {
    /// Not authenticated
    NotAuthenticated,
    /// Authentication in progress - URL ready for user
    AwaitingAuth { auth_url: String },
    /// Successfully authenticated
    Authenticated,
    /// Authentication failed
    Failed { error: String },
}

/// Package manager options for installing Codex
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PackageManager {
    Npm,
    Bun,
}

impl PackageManager {
    pub fn command(&self) -> &str {
        match self {
            PackageManager::Npm => "npm",
            PackageManager::Bun => "bun",
        }
    }

    pub fn install_args(&self) -> Vec<&str> {
        match self {
            PackageManager::Npm => vec!["install", "-g", "@openai/codex"],
            PackageManager::Bun => vec!["add", "-g", "@openai/codex"],
        }
    }

    pub fn description(&self) -> &str {
        match self {
            PackageManager::Npm => "Node Package Manager - widely used, stable",
            PackageManager::Bun => "Fast JavaScript runtime - faster installation",
        }
    }
}

/// Information about available package managers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageManagerInfo {
    pub id: PackageManager,
    pub name: String,
    pub available: bool,
    pub version: Option<String>,
    pub description: String,
}

/// Main Codex manager that coordinates all functionality
pub struct CodexManager {
    pub installer: CodexInstaller,
    pub auth: CodexAuth,
    pub sessions: Arc<RwLock<std::collections::HashMap<String, CodexSession>>>,
    status: Arc<RwLock<CodexStatus>>,
    auth_status: Arc<RwLock<CodexAuthStatus>>,
}

impl CodexManager {
    pub fn new() -> Self {
        Self {
            installer: CodexInstaller::new(),
            auth: CodexAuth::new(),
            sessions: Arc::new(RwLock::new(std::collections::HashMap::new())),
            status: Arc::new(RwLock::new(CodexStatus::NotInstalled)),
            auth_status: Arc::new(RwLock::new(CodexAuthStatus::NotAuthenticated)),
        }
    }

    /// Check if Codex CLI is installed
    pub async fn check_installed(&self) -> CodexStatus {
        let status = self.installer.check_installed().await;
        *self.status.write().await = status.clone();
        status
    }

    /// Get current installation status
    pub async fn get_status(&self) -> CodexStatus {
        self.status.read().await.clone()
    }

    /// Get current auth status
    pub async fn get_auth_status(&self) -> CodexAuthStatus {
        self.auth_status.read().await.clone()
    }

    /// Set auth status (called by auth module)
    pub async fn set_auth_status(&self, status: CodexAuthStatus) {
        *self.auth_status.write().await = status;
    }

    /// Get available package managers
    pub async fn get_package_managers(&self) -> Vec<PackageManagerInfo> {
        self.installer.get_available_package_managers().await
    }

    /// Install Codex using specified package manager
    pub async fn install(&self, package_manager: PackageManager) -> Result<CodexStatus, String> {
        *self.status.write().await = CodexStatus::Installing {
            progress: "Starting installation...".to_string(),
        };

        match self.installer.install(package_manager).await {
            Ok(version) => {
                let status = CodexStatus::Installed { version };
                *self.status.write().await = status.clone();
                Ok(status)
            }
            Err(e) => {
                let status = CodexStatus::InstallFailed { error: e.clone() };
                *self.status.write().await = status.clone();
                Err(e)
            }
        }
    }

    /// Start login flow
    pub async fn login(&self) -> Result<CodexAuthStatus, String> {
        *self.auth_status.write().await = CodexAuthStatus::NotAuthenticated;

        match self.auth.start_login().await {
            Ok(auth_url) => {
                let status = CodexAuthStatus::AwaitingAuth { auth_url };
                *self.auth_status.write().await = status.clone();
                Ok(status)
            }
            Err(e) => {
                let status = CodexAuthStatus::Failed { error: e.clone() };
                *self.auth_status.write().await = status;
                Err(e)
            }
        }
    }

    /// Check if authentication completed
    pub async fn check_auth_complete(&self) -> CodexAuthStatus {
        if self.auth.check_authenticated().await {
            let status = CodexAuthStatus::Authenticated;
            *self.auth_status.write().await = status.clone();
            status
        } else {
            self.auth_status.read().await.clone()
        }
    }

    /// Create a new Codex session
    pub async fn create_session(&self, working_dir: &str) -> Result<String, String> {
        let session = CodexSession::new(working_dir)?;
        let session_id = session.id.clone();
        self.sessions
            .write()
            .await
            .insert(session_id.clone(), session);
        Ok(session_id)
    }

    /// Get a session by ID
    pub async fn get_session(&self, session_id: &str) -> Option<CodexSession> {
        self.sessions.read().await.get(session_id).cloned()
    }

    /// Remove a session
    pub async fn remove_session(&self, session_id: &str) -> Option<CodexSession> {
        self.sessions.write().await.remove(session_id)
    }
}

impl Default for CodexManager {
    fn default() -> Self {
        Self::new()
    }
}
