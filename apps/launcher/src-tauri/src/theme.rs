use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemTheme {
    pub is_dark: bool,
    pub accent_color: Option<String>,
    pub window_blur_supported: bool,
}

impl Default for SystemTheme {
    fn default() -> Self {
        Self {
            is_dark: true,
            accent_color: None,
            window_blur_supported: false,
        }
    }
}

pub fn get_system_theme() -> SystemTheme {
    #[cfg(target_os = "linux")]
    {
        get_linux_theme()
    }

    #[cfg(target_os = "windows")]
    {
        get_windows_theme()
    }

    #[cfg(target_os = "macos")]
    {
        get_macos_theme()
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        SystemTheme::default()
    }
}

#[cfg(target_os = "linux")]
fn get_linux_theme() -> SystemTheme {
    let is_dark = detect_linux_dark_mode();
    let accent_color = detect_linux_accent_color();
    let window_blur_supported = detect_linux_compositor_blur();

    SystemTheme {
        is_dark,
        accent_color,
        window_blur_supported,
    }
}

#[cfg(target_os = "linux")]
fn detect_linux_dark_mode() -> bool {
    if let Ok(output) = Command::new("gsettings")
        .args(["get", "org.gnome.desktop.interface", "color-scheme"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if stdout.contains("dark") {
            return true;
        }
    }

    if let Ok(output) = Command::new("gsettings")
        .args(["get", "org.gnome.desktop.interface", "gtk-theme"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout).to_lowercase();
        if stdout.contains("dark") {
            return true;
        }
    }

    if let Ok(output) = Command::new("kreadconfig5")
        .args([
            "--group",
            "General",
            "--key",
            "ColorScheme",
            "--file",
            "kdeglobals",
        ])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout).to_lowercase();
        if stdout.contains("dark") || stdout.contains("breeze") {
            return true;
        }
    }

    true
}

#[cfg(target_os = "linux")]
fn detect_linux_accent_color() -> Option<String> {
    if let Ok(output) = Command::new("gsettings")
        .args(["get", "org.gnome.desktop.interface", "accent-color"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !stdout.is_empty() && stdout != "''" {
            let color = stdout.trim_matches('\'');
            return accent_name_to_hex(color);
        }
    }

    if let Ok(output) = Command::new("kreadconfig5")
        .args([
            "--group",
            "Colors:View",
            "--key",
            "DecorationFocus",
            "--file",
            "kdeglobals",
        ])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !stdout.is_empty() {
            let parts: Vec<&str> = stdout.split(',').collect();
            if parts.len() >= 3 {
                if let (Ok(r), Ok(g), Ok(b)) = (
                    parts[0].parse::<u8>(),
                    parts[1].parse::<u8>(),
                    parts[2].parse::<u8>(),
                ) {
                    return Some(format!("#{:02x}{:02x}{:02x}", r, g, b));
                }
            }
        }
    }

    None
}

fn accent_name_to_hex(name: &str) -> Option<String> {
    match name.to_lowercase().as_str() {
        "blue" => Some("#3584e4".to_string()),
        "teal" => Some("#2190a4".to_string()),
        "green" => Some("#3a944a".to_string()),
        "yellow" => Some("#c88800".to_string()),
        "orange" => Some("#ed5b00".to_string()),
        "red" => Some("#e62d42".to_string()),
        "pink" => Some("#d56199".to_string()),
        "purple" => Some("#9141ac".to_string()),
        "slate" => Some("#6f8396".to_string()),
        _ => None,
    }
}

#[cfg(target_os = "linux")]
fn detect_linux_compositor_blur() -> bool {
    if std::env::var("XDG_SESSION_TYPE").map(|v| v == "wayland").unwrap_or(false) {
        if std::env::var("XDG_CURRENT_DESKTOP")
            .map(|v| v.to_lowercase().contains("kde"))
            .unwrap_or(false)
        {
            return true;
        }
    }

    if let Ok(output) = Command::new("pgrep").args(["-x", "picom"]).output() {
        if output.status.success() {
            return true;
        }
    }

    if let Ok(output) = Command::new("pgrep").args(["-x", "compiz"]).output() {
        if output.status.success() {
            return true;
        }
    }

    false
}

#[cfg(target_os = "windows")]
fn get_windows_theme() -> SystemTheme {
    SystemTheme {
        is_dark: true,
        accent_color: Some("#0078d4".to_string()),
        window_blur_supported: true,
    }
}

#[cfg(target_os = "macos")]
fn get_macos_theme() -> SystemTheme {
    SystemTheme {
        is_dark: true,
        accent_color: Some("#007aff".to_string()),
        window_blur_supported: true,
    }
}
