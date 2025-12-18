use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use tokio::sync::RwLock;

/// Handles Codex CLI authentication
pub struct CodexAuth {
    /// Current login process (if running)
    login_process: Arc<RwLock<Option<Child>>>,
    /// Extracted auth URL from login process
    auth_url: Arc<RwLock<Option<String>>>,
    /// Whether login completed successfully
    authenticated: Arc<RwLock<bool>>,
}

impl CodexAuth {
    pub fn new() -> Self {
        Self {
            login_process: Arc::new(RwLock::new(None)),
            auth_url: Arc::new(RwLock::new(None)),
            authenticated: Arc::new(RwLock::new(false)),
        }
    }

    /// Start the login process and extract the auth URL
    pub async fn start_login(&self) -> Result<String, String> {
        // Kill any existing login process
        self.cancel_login().await;

        // Reset state
        *self.authenticated.write().await = false;
        *self.auth_url.write().await = None;

        // Start codex login process
        let mut child = Command::new("codex")
            .arg("login")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start codex login: {}", e))?;

        // Read stdout to find the auth URL
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Failed to capture stdout".to_string())?;

        let auth_url = Arc::clone(&self.auth_url);
        let authenticated = Arc::clone(&self.authenticated);

        // Spawn a thread to monitor the login process output
        let reader = BufReader::new(stdout);

        // Try to find the auth URL in the output
        let mut found_url = None;

        for line in reader.lines() {
            match line {
                Ok(line) => {
                    eprintln!("Codex login output: {}", line);

                    // Look for the auth URL
                    if let Some(url) = Self::extract_auth_url(&line) {
                        found_url = Some(url.clone());
                        *auth_url.write().await = Some(url);
                        break; // We found the URL, stop reading for now
                    }

                    // Check for success message
                    if line.contains("Successfully logged in")
                        || line.contains("successfully logged in")
                    {
                        *authenticated.write().await = true;
                    }
                }
                Err(e) => {
                    eprintln!("Error reading codex output: {}", e);
                    break;
                }
            }
        }

        // Store the child process so we can monitor it
        *self.login_process.write().await = Some(child);

        // Return the auth URL if found
        found_url.ok_or_else(|| "Could not extract auth URL from codex login output".to_string())
    }

    /// Extract the OAuth URL from a line of codex output
    fn extract_auth_url(line: &str) -> Option<String> {
        // The URL typically appears in a line like:
        // "If your browser did not open, navigate to this URL to authenticate:"
        // Followed by the URL on the next line, or embedded in the same line

        // Look for https://auth.openai.com pattern
        if let Some(start) = line.find("https://auth.openai.com") {
            // Extract URL until whitespace or end of line
            let url_part = &line[start..];
            let end = url_part
                .find(|c: char| c.is_whitespace())
                .unwrap_or(url_part.len());
            return Some(url_part[..end].to_string());
        }

        // Also check for any https:// URL that might be the auth URL
        if line.contains("https://")
            && (line.contains("oauth") || line.contains("auth") || line.contains("authorize"))
        {
            if let Some(start) = line.find("https://") {
                let url_part = &line[start..];
                let end = url_part
                    .find(|c: char| c.is_whitespace())
                    .unwrap_or(url_part.len());
                return Some(url_part[..end].to_string());
            }
        }

        None
    }

    /// Check if the login process has completed successfully
    pub async fn check_authenticated(&self) -> bool {
        // First check our flag
        if *self.authenticated.read().await {
            return true;
        }

        // Try running codex with a simple command to verify auth
        // We could use `codex --version` or similar, but for now
        // we'll check if the login process exited successfully
        let mut process_guard = self.login_process.write().await;
        if let Some(ref mut child) = *process_guard {
            match child.try_wait() {
                Ok(Some(status)) => {
                    if status.success() {
                        *self.authenticated.write().await = true;
                        return true;
                    }
                }
                Ok(None) => {
                    // Process still running, continue monitoring
                    // Try to read more output
                    if let Some(ref mut stdout) = child.stdout {
                        // Non-blocking read attempt would go here
                        // For now, we'll rely on the initial read
                    }
                }
                Err(e) => {
                    eprintln!("Error checking login process: {}", e);
                }
            }
        }

        false
    }

    /// Cancel any ongoing login process
    pub async fn cancel_login(&self) {
        let mut process_guard = self.login_process.write().await;
        if let Some(mut child) = process_guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }

    /// Get the current auth URL (if available)
    pub async fn get_auth_url(&self) -> Option<String> {
        self.auth_url.read().await.clone()
    }

    /// Manually mark as authenticated (for polling scenarios)
    pub async fn mark_authenticated(&self) {
        *self.authenticated.write().await = true;
    }
}

impl Default for CodexAuth {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for CodexAuth {
    fn drop(&mut self) {
        // Clean up any running process
        if let Ok(mut guard) = self.login_process.try_write() {
            if let Some(mut child) = guard.take() {
                let _ = child.kill();
            }
        }
    }
}
