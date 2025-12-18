use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use tokio::sync::Mutex;

/// Supported framework types for dev servers
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Framework {
    NextJs,
    Vite,
    CreateReactApp,
    Vue,
    Svelte,
    Remix,
    Astro,
    Unknown,
}

impl Framework {
    /// Get the default dev command for this framework
    pub fn default_command(&self) -> &str {
        match self {
            Framework::NextJs => "bun run dev",
            Framework::Vite => "bun run dev",
            Framework::CreateReactApp => "bun start",
            Framework::Vue => "bun run dev",
            Framework::Svelte => "bun run dev",
            Framework::Remix => "bun run dev",
            Framework::Astro => "bun run dev",
            Framework::Unknown => "bun run dev",
        }
    }

    /// Get the default port for this framework
    pub fn default_port(&self) -> u16 {
        match self {
            Framework::NextJs => 3000,
            Framework::Vite => 5173,
            Framework::CreateReactApp => 3000,
            Framework::Vue => 5173,
            Framework::Svelte => 5173,
            Framework::Remix => 3000,
            Framework::Astro => 4321,
            Framework::Unknown => 3000,
        }
    }

    /// Get display name
    pub fn display_name(&self) -> &str {
        match self {
            Framework::NextJs => "Next.js",
            Framework::Vite => "Vite",
            Framework::CreateReactApp => "Create React App",
            Framework::Vue => "Vue",
            Framework::Svelte => "Svelte",
            Framework::Remix => "Remix",
            Framework::Astro => "Astro",
            Framework::Unknown => "Unknown",
        }
    }
}

/// Information about a running dev server
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevServerInfo {
    /// The URL where the dev server is accessible
    pub url: String,
    /// The command used to start the server
    pub command: String,
    /// The detected framework
    pub framework: String,
    /// Whether the server is currently running
    pub is_running: bool,
    /// The port the server is running on
    pub port: u16,
    /// The working directory
    pub working_dir: String,
}

/// A running dev server instance
pub struct DevServer {
    /// Process handle
    process: Option<Child>,
    /// Working directory
    working_dir: PathBuf,
    /// Command used to start
    command: String,
    /// Detected framework
    framework: Framework,
    /// Port the server is running on
    port: u16,
    /// Whether the server is running
    is_running: bool,
}

impl DevServer {
    /// Create a new dev server (not yet started)
    pub fn new(working_dir: &Path, command: Option<String>, framework: Option<Framework>) -> Self {
        let detected_framework = framework.unwrap_or_else(|| detect_framework(working_dir));
        let cmd = command.unwrap_or_else(|| detected_framework.default_command().to_string());
        let port = detected_framework.default_port();

        Self {
            process: None,
            working_dir: working_dir.to_path_buf(),
            command: cmd,
            framework: detected_framework,
            port,
            is_running: false,
        }
    }

    /// Start the dev server
    pub fn start(&mut self) -> Result<DevServerInfo, String> {
        if self.is_running {
            return Err("Dev server is already running".to_string());
        }

        // Parse the command
        let parts: Vec<&str> = self.command.split_whitespace().collect();
        if parts.is_empty() {
            return Err("Empty command".to_string());
        }

        let (program, args) =
            if parts[0] == "npm" || parts[0] == "yarn" || parts[0] == "pnpm" || parts[0] == "bun" {
                (parts[0], &parts[1..])
            } else {
                (parts[0], &parts[1..])
            };

        // Spawn the dev server process
        let child = Command::new(program)
            .args(args)
            .current_dir(&self.working_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start dev server: {}", e))?;

        self.process = Some(child);
        self.is_running = true;

        // Try to detect the actual port from output (async in background)
        // For now, use the default port
        let url = format!("http://localhost:{}", self.port);

        Ok(self.get_info())
    }

    /// Stop the dev server
    pub fn stop(&mut self) -> Result<(), String> {
        if let Some(mut process) = self.process.take() {
            // Try graceful shutdown first
            #[cfg(unix)]
            {
                use std::os::unix::process::CommandExt;
                // Send SIGTERM
                unsafe {
                    libc::kill(process.id() as i32, libc::SIGTERM);
                }
                // Give it a moment to shut down gracefully
                std::thread::sleep(std::time::Duration::from_millis(500));
            }

            // Force kill if still running
            let _ = process.kill();
            let _ = process.wait();
        }

        self.is_running = false;
        Ok(())
    }

    /// Get information about this dev server
    pub fn get_info(&self) -> DevServerInfo {
        DevServerInfo {
            url: format!("http://localhost:{}", self.port),
            command: self.command.clone(),
            framework: self.framework.display_name().to_string(),
            is_running: self.is_running,
            port: self.port,
            working_dir: self.working_dir.to_string_lossy().to_string(),
        }
    }

    /// Check if the server is still running
    pub fn check_running(&mut self) -> bool {
        if let Some(ref mut process) = self.process {
            match process.try_wait() {
                Ok(Some(_)) => {
                    // Process has exited
                    self.is_running = false;
                    self.process = None;
                    false
                }
                Ok(None) => {
                    // Still running
                    true
                }
                Err(_) => {
                    self.is_running = false;
                    false
                }
            }
        } else {
            self.is_running = false;
            false
        }
    }
}

impl Drop for DevServer {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}

/// Dev server manager for multiple sessions
pub struct DevServerManager {
    /// Map of session ID to dev server
    servers: Arc<Mutex<HashMap<String, DevServer>>>,
}

impl DevServerManager {
    pub fn new() -> Self {
        Self {
            servers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Start a dev server for a session
    pub async fn start_server(
        &self,
        session_id: &str,
        working_dir: &Path,
        command: Option<String>,
    ) -> Result<DevServerInfo, String> {
        let mut servers = self.servers.lock().await;

        // Stop existing server for this session if any
        if let Some(mut existing) = servers.remove(session_id) {
            let _ = existing.stop();
        }

        // Create and start new server
        let mut server = DevServer::new(working_dir, command, None);
        let info = server.start()?;
        servers.insert(session_id.to_string(), server);

        Ok(info)
    }

    /// Stop a dev server for a session
    pub async fn stop_server(&self, session_id: &str) -> Result<(), String> {
        let mut servers = self.servers.lock().await;
        if let Some(mut server) = servers.remove(session_id) {
            server.stop()
        } else {
            Ok(()) // No server to stop
        }
    }

    /// Get info about a session's dev server
    pub async fn get_server_info(&self, session_id: &str) -> Option<DevServerInfo> {
        let mut servers = self.servers.lock().await;
        if let Some(server) = servers.get_mut(session_id) {
            // Update running status
            server.check_running();
            Some(server.get_info())
        } else {
            None
        }
    }

    /// Check if a session has a running dev server
    pub async fn has_running_server(&self, session_id: &str) -> bool {
        let mut servers = self.servers.lock().await;
        if let Some(server) = servers.get_mut(session_id) {
            server.check_running()
        } else {
            false
        }
    }
}

impl Default for DevServerManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Detect the framework from package.json and other files
pub fn detect_framework(working_dir: &Path) -> Framework {
    let package_json_path = working_dir.join("package.json");

    if !package_json_path.exists() {
        return Framework::Unknown;
    }

    // Read and parse package.json
    let content = match std::fs::read_to_string(&package_json_path) {
        Ok(c) => c,
        Err(_) => return Framework::Unknown,
    };

    let package: serde_json::Value = match serde_json::from_str(&content) {
        Ok(p) => p,
        Err(_) => return Framework::Unknown,
    };

    // Check dependencies and devDependencies
    let deps = package.get("dependencies").and_then(|d| d.as_object());
    let dev_deps = package.get("devDependencies").and_then(|d| d.as_object());

    let has_dep = |name: &str| -> bool {
        deps.map(|d| d.contains_key(name)).unwrap_or(false)
            || dev_deps.map(|d| d.contains_key(name)).unwrap_or(false)
    };

    // Detect framework based on dependencies
    if has_dep("next") {
        Framework::NextJs
    } else if has_dep("@remix-run/react") || has_dep("@remix-run/dev") {
        Framework::Remix
    } else if has_dep("astro") {
        Framework::Astro
    } else if has_dep("vite") {
        // Check for specific Vite-based frameworks
        if has_dep("vue") {
            Framework::Vue
        } else if has_dep("svelte") || has_dep("@sveltejs/kit") {
            Framework::Svelte
        } else {
            Framework::Vite
        }
    } else if has_dep("react-scripts") {
        Framework::CreateReactApp
    } else if has_dep("vue") {
        Framework::Vue
    } else if has_dep("svelte") {
        Framework::Svelte
    } else if has_dep("react") {
        // Generic React project, assume Vite or similar
        Framework::Vite
    } else {
        Framework::Unknown
    }
}

/// Detect the best command to run for a dev server
pub fn detect_dev_command(working_dir: &Path) -> Option<String> {
    let package_json_path = working_dir.join("package.json");

    if !package_json_path.exists() {
        return None;
    }

    let content = std::fs::read_to_string(&package_json_path).ok()?;
    let package: serde_json::Value = serde_json::from_str(&content).ok()?;

    let scripts = package.get("scripts")?.as_object()?;

    // Priority order for dev commands
    let dev_commands = ["dev", "start", "serve", "develop"];

    for cmd in dev_commands {
        if scripts.contains_key(cmd) {
            // Detect package manager
            let pm = if working_dir.join("bun.lockb").exists() {
                "bun"
            } else if working_dir.join("pnpm-lock.yaml").exists() {
                "pnpm"
            } else if working_dir.join("yarn.lock").exists() {
                "yarn"
            } else {
                "npm"
            };

            return Some(format!("{} run {}", pm, cmd));
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_detect_nextjs() {
        let dir = tempdir().unwrap();
        let package_json = r#"{
            "dependencies": {
                "next": "14.0.0",
                "react": "18.0.0"
            }
        }"#;
        fs::write(dir.path().join("package.json"), package_json).unwrap();

        assert_eq!(detect_framework(dir.path()), Framework::NextJs);
    }

    #[test]
    fn test_detect_vite() {
        let dir = tempdir().unwrap();
        let package_json = r#"{
            "devDependencies": {
                "vite": "5.0.0"
            }
        }"#;
        fs::write(dir.path().join("package.json"), package_json).unwrap();

        assert_eq!(detect_framework(dir.path()), Framework::Vite);
    }
}
