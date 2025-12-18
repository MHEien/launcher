use super::{CodexStatus, PackageManager, PackageManagerInfo};
use std::process::Command;

/// Status of bun installation
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(tag = "status")]
pub enum BunInstallStatus {
    /// Installation in progress
    Installing { message: String },
    /// Installation completed
    Completed { version: String },
    /// Installation failed
    Failed { error: String },
}

/// Handles Codex CLI installation and package manager detection
pub struct CodexInstaller;

impl CodexInstaller {
    pub fn new() -> Self {
        Self
    }

    /// Check if Codex CLI is installed by running `codex -V`
    pub async fn check_installed(&self) -> CodexStatus {
        // Run codex -V to check if installed and get version
        let output = Command::new("codex").arg("-V").output();

        match output {
            Ok(output) if output.status.success() => {
                let version = String::from_utf8_lossy(&output.stdout)
                    .trim()
                    .to_string();
                // Version output might be "codex 1.0.0" or just "1.0.0"
                let version = version
                    .strip_prefix("codex ")
                    .unwrap_or(&version)
                    .to_string();
                CodexStatus::Installed { version }
            }
            Ok(output) => {
                // Command ran but failed - check stderr for more info
                let stderr = String::from_utf8_lossy(&output.stderr);
                eprintln!("Codex check failed: {}", stderr);
                CodexStatus::NotInstalled
            }
            Err(e) => {
                // Command not found or other error
                eprintln!("Codex not found: {}", e);
                CodexStatus::NotInstalled
            }
        }
    }

    /// Get available package managers with their versions
    pub async fn get_available_package_managers(&self) -> Vec<PackageManagerInfo> {
        let mut managers = Vec::new();

        // Check npm
        let npm_version = Self::get_command_version("npm", &["-v"]);
        managers.push(PackageManagerInfo {
            id: PackageManager::Npm,
            name: "npm".to_string(),
            available: npm_version.is_some(),
            version: npm_version,
            description: PackageManager::Npm.description().to_string(),
        });

        // Check bun
        let bun_version = Self::get_command_version("bun", &["-v"]);
        managers.push(PackageManagerInfo {
            id: PackageManager::Bun,
            name: "bun".to_string(),
            available: bun_version.is_some(),
            version: bun_version,
            description: PackageManager::Bun.description().to_string(),
        });

        managers
    }

    /// Get version of a command by running it with the specified args
    fn get_command_version(command: &str, args: &[&str]) -> Option<String> {
        Command::new(command)
            .args(args)
            .output()
            .ok()
            .filter(|output| output.status.success())
            .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
    }

    /// Install Codex using the specified package manager
    pub async fn install(&self, package_manager: PackageManager) -> Result<String, String> {
        let cmd = package_manager.command();
        let args = package_manager.install_args();

        eprintln!("Installing Codex with {} {:?}", cmd, args);

        // Run installation command
        let output = Command::new(cmd)
            .args(&args)
            .output()
            .map_err(|e| format!("Failed to run {}: {}", cmd, e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            return Err(format!(
                "Installation failed:\nstdout: {}\nstderr: {}",
                stdout, stderr
            ));
        }

        // Verify installation by checking version
        let status = self.check_installed().await;
        match status {
            CodexStatus::Installed { version } => Ok(version),
            _ => Err("Installation completed but codex command not found. You may need to restart your terminal or add it to PATH.".to_string()),
        }
    }
}

impl Default for CodexInstaller {
    fn default() -> Self {
        Self::new()
    }
}

impl CodexInstaller {
    /// Install Bun automatically using platform-specific installer
    pub async fn install_bun(&self) -> Result<String, String> {
        eprintln!("Starting Bun installation...");

        #[cfg(target_os = "windows")]
        {
            self.install_bun_windows().await
        }

        #[cfg(target_os = "macos")]
        {
            self.install_bun_unix().await
        }

        #[cfg(target_os = "linux")]
        {
            self.install_bun_unix().await
        }
    }

    #[cfg(target_os = "windows")]
    async fn install_bun_windows(&self) -> Result<String, String> {
        // On Windows, use PowerShell to run the bun installer
        // irm bun.sh/install.ps1 | iex
        let output = Command::new("powershell")
            .args([
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                "irm bun.sh/install.ps1 | iex",
            ])
            .output()
            .map_err(|e| format!("Failed to run PowerShell: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            return Err(format!(
                "Bun installation failed:\n{}\n{}",
                stdout, stderr
            ));
        }

        // Verify installation
        std::thread::sleep(std::time::Duration::from_secs(1));
        
        // Try to get bun version - may need to refresh PATH
        // On Windows, bun installs to %USERPROFILE%\.bun\bin
        let home = std::env::var("USERPROFILE").unwrap_or_default();
        let bun_path = format!("{}\\.bun\\bin\\bun.exe", home);
        
        let version_output = Command::new(&bun_path)
            .arg("-v")
            .output()
            .or_else(|_| Command::new("bun").arg("-v").output())
            .map_err(|e| format!("Bun installed but cannot verify version: {}", e))?;

        if version_output.status.success() {
            let version = String::from_utf8_lossy(&version_output.stdout)
                .trim()
                .to_string();
            Ok(version)
        } else {
            // Installation might have succeeded but PATH not updated
            Ok("installed (restart terminal to use)".to_string())
        }
    }

    #[cfg(any(target_os = "macos", target_os = "linux"))]
    async fn install_bun_unix(&self) -> Result<String, String> {
        // On Unix, use curl to run the bun installer
        // curl -fsSL https://bun.sh/install | bash
        let output = Command::new("bash")
            .args(["-c", "curl -fsSL https://bun.sh/install | bash"])
            .output()
            .map_err(|e| format!("Failed to run installer: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            return Err(format!(
                "Bun installation failed:\n{}\n{}",
                stdout, stderr
            ));
        }

        // Verify installation
        std::thread::sleep(std::time::Duration::from_secs(1));
        
        // Try to get bun version - may need to source profile
        let home = std::env::var("HOME").unwrap_or_default();
        let bun_path = format!("{}/.bun/bin/bun", home);
        
        let version_output = Command::new(&bun_path)
            .arg("-v")
            .output()
            .or_else(|_| Command::new("bun").arg("-v").output())
            .map_err(|e| format!("Bun installed but cannot verify version: {}", e))?;

        if version_output.status.success() {
            let version = String::from_utf8_lossy(&version_output.stdout)
                .trim()
                .to_string();
            Ok(version)
        } else {
            // Installation might have succeeded but PATH not updated
            Ok("installed (restart terminal to use)".to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_package_managers() {
        let installer = CodexInstaller::new();
        let managers = installer.get_available_package_managers().await;
        
        // Should always return both npm and bun entries (even if not available)
        assert_eq!(managers.len(), 2);
        assert!(managers.iter().any(|m| m.id == PackageManager::Npm));
        assert!(managers.iter().any(|m| m.id == PackageManager::Bun));
    }
}

