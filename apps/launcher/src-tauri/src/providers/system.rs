use super::{ResultCategory, ResultIcon, SearchProvider, SearchResult};
use strsim::jaro_winkler;

#[derive(Clone)]
struct SystemCommand {
    id: &'static str,
    name: &'static str,
    description: &'static str,
    icon: &'static str,
    keywords: &'static [&'static str],
}

const SYSTEM_COMMANDS: &[SystemCommand] = &[
    SystemCommand {
        id: "shutdown",
        name: "Shutdown",
        description: "Shut down the computer",
        icon: "⏻",
        keywords: &["shutdown", "power off", "turn off", "halt"],
    },
    SystemCommand {
        id: "restart",
        name: "Restart",
        description: "Restart the computer",
        icon: "🔄",
        keywords: &["restart", "reboot", "reset"],
    },
    SystemCommand {
        id: "sleep",
        name: "Sleep",
        description: "Put the computer to sleep",
        icon: "💤",
        keywords: &["sleep", "suspend", "hibernate"],
    },
    SystemCommand {
        id: "lock",
        name: "Lock Screen",
        description: "Lock the screen",
        icon: "🔒",
        keywords: &["lock", "lock screen", "secure"],
    },
    SystemCommand {
        id: "logout",
        name: "Log Out",
        description: "Log out of your account",
        icon: "🚪",
        keywords: &["logout", "log out", "sign out", "signout"],
    },
    #[cfg(target_os = "windows")]
    SystemCommand {
        id: "taskmanager",
        name: "Task Manager",
        description: "Open Task Manager",
        icon: "📊",
        keywords: &["task manager", "taskmgr", "processes", "kill"],
    },
    #[cfg(target_os = "macos")]
    SystemCommand {
        id: "forcequit",
        name: "Force Quit",
        description: "Open Force Quit Applications",
        icon: "⚠️",
        keywords: &["force quit", "kill", "processes"],
    },
    SystemCommand {
        id: "emptytrash",
        name: "Empty Trash",
        description: "Empty the trash/recycle bin",
        icon: "🗑️",
        keywords: &["empty trash", "recycle bin", "delete", "clean"],
    },
];

pub struct SystemProvider;

impl SystemProvider {
    pub fn new() -> Self {
        Self
    }

    fn score_match(query: &str, cmd: &SystemCommand) -> f32 {
        let query_lower = query.to_lowercase();
        let name_lower = cmd.name.to_lowercase();

        // Exact match on name
        if name_lower == query_lower {
            return 100.0;
        }

        // Name starts with query
        if name_lower.starts_with(&query_lower) {
            return 90.0;
        }

        // Name contains query
        if name_lower.contains(&query_lower) {
            return 80.0;
        }

        // Keyword match
        for keyword in cmd.keywords {
            let kw_lower = keyword.to_lowercase();
            if kw_lower == query_lower {
                return 85.0;
            }
            if kw_lower.starts_with(&query_lower) {
                return 75.0;
            }
            if kw_lower.contains(&query_lower) {
                return 65.0;
            }
        }

        // Fuzzy match on name
        let jw_score = jaro_winkler(&query_lower, &name_lower) as f32;
        if jw_score > 0.8 {
            return 50.0 + (jw_score - 0.8) * 100.0;
        }

        // Fuzzy match on keywords
        for keyword in cmd.keywords {
            let kw_jw = jaro_winkler(&query_lower, &keyword.to_lowercase()) as f32;
            if kw_jw > 0.8 {
                return 40.0 + (kw_jw - 0.8) * 50.0;
            }
        }

        0.0
    }
}

impl SearchProvider for SystemProvider {
    fn id(&self) -> &str {
        "system"
    }

    fn search(&self, query: &str) -> Vec<SearchResult> {
        if query.trim().len() < 2 {
            return vec![];
        }

        let mut results: Vec<(SearchResult, f32)> = SYSTEM_COMMANDS
            .iter()
            .filter_map(|cmd| {
                let score = Self::score_match(query, cmd);
                if score > 40.0 {
                    Some((
                        SearchResult {
                            id: format!("system:{}", cmd.id),
                            title: cmd.name.to_string(),
                            subtitle: Some(cmd.description.to_string()),
                            icon: ResultIcon::Emoji(cmd.icon.to_string()),
                            category: ResultCategory::System,
                            score,
                        },
                        score,
                    ))
                } else {
                    None
                }
            })
            .collect();

        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        results.into_iter().map(|(r, _)| r).take(5).collect()
    }

    fn execute(&self, result_id: &str) -> Result<(), String> {
        let Some(cmd_id) = result_id.strip_prefix("system:") else {
            return Err("Invalid system command result".to_string());
        };

        match cmd_id {
            "shutdown" => {
                #[cfg(target_os = "linux")]
                {
                    std::process::Command::new("systemctl")
                        .args(["poweroff"])
                        .spawn()
                        .map_err(|e| format!("Failed to shutdown: {}", e))?;
                }
                #[cfg(target_os = "macos")]
                {
                    std::process::Command::new("osascript")
                        .args(["-e", "tell app \"System Events\" to shut down"])
                        .spawn()
                        .map_err(|e| format!("Failed to shutdown: {}", e))?;
                }
                #[cfg(target_os = "windows")]
                {
                    std::process::Command::new("shutdown")
                        .args(["/s", "/t", "0"])
                        .spawn()
                        .map_err(|e| format!("Failed to shutdown: {}", e))?;
                }
            }
            "restart" => {
                #[cfg(target_os = "linux")]
                {
                    std::process::Command::new("systemctl")
                        .args(["reboot"])
                        .spawn()
                        .map_err(|e| format!("Failed to restart: {}", e))?;
                }
                #[cfg(target_os = "macos")]
                {
                    std::process::Command::new("osascript")
                        .args(["-e", "tell app \"System Events\" to restart"])
                        .spawn()
                        .map_err(|e| format!("Failed to restart: {}", e))?;
                }
                #[cfg(target_os = "windows")]
                {
                    std::process::Command::new("shutdown")
                        .args(["/r", "/t", "0"])
                        .spawn()
                        .map_err(|e| format!("Failed to restart: {}", e))?;
                }
            }
            "sleep" => {
                #[cfg(target_os = "linux")]
                {
                    std::process::Command::new("systemctl")
                        .args(["suspend"])
                        .spawn()
                        .map_err(|e| format!("Failed to sleep: {}", e))?;
                }
                #[cfg(target_os = "macos")]
                {
                    std::process::Command::new("pmset")
                        .args(["sleepnow"])
                        .spawn()
                        .map_err(|e| format!("Failed to sleep: {}", e))?;
                }
                #[cfg(target_os = "windows")]
                {
                    std::process::Command::new("rundll32.exe")
                        .args(["powrprof.dll,SetSuspendState", "0,1,0"])
                        .spawn()
                        .map_err(|e| format!("Failed to sleep: {}", e))?;
                }
            }
            "lock" => {
                #[cfg(target_os = "linux")]
                {
                    // Try different lock commands
                    let result = std::process::Command::new("loginctl")
                        .args(["lock-session"])
                        .spawn();
                    if result.is_err() {
                        std::process::Command::new("xdg-screensaver")
                            .args(["lock"])
                            .spawn()
                            .map_err(|e| format!("Failed to lock: {}", e))?;
                    }
                }
                #[cfg(target_os = "macos")]
                {
                    std::process::Command::new("pmset")
                        .args(["displaysleepnow"])
                        .spawn()
                        .map_err(|e| format!("Failed to lock: {}", e))?;
                }
                #[cfg(target_os = "windows")]
                {
                    std::process::Command::new("rundll32.exe")
                        .args(["user32.dll,LockWorkStation"])
                        .spawn()
                        .map_err(|e| format!("Failed to lock: {}", e))?;
                }
            }
            "logout" => {
                #[cfg(target_os = "linux")]
                {
                    std::process::Command::new("loginctl")
                        .args(["terminate-user", &whoami::username()])
                        .spawn()
                        .map_err(|e| format!("Failed to logout: {}", e))?;
                }
                #[cfg(target_os = "macos")]
                {
                    std::process::Command::new("osascript")
                        .args(["-e", "tell app \"System Events\" to log out"])
                        .spawn()
                        .map_err(|e| format!("Failed to logout: {}", e))?;
                }
                #[cfg(target_os = "windows")]
                {
                    std::process::Command::new("shutdown")
                        .args(["/l"])
                        .spawn()
                        .map_err(|e| format!("Failed to logout: {}", e))?;
                }
            }
            #[cfg(target_os = "windows")]
            "taskmanager" => {
                std::process::Command::new("taskmgr")
                    .spawn()
                    .map_err(|e| format!("Failed to open Task Manager: {}", e))?;
            }
            #[cfg(target_os = "macos")]
            "forcequit" => {
                std::process::Command::new("osascript")
                    .args(["-e", "tell app \"System Events\" to keystroke \"escape\" using {command down, option down}"])
                    .spawn()
                    .map_err(|e| format!("Failed to open Force Quit: {}", e))?;
            }
            "emptytrash" => {
                #[cfg(target_os = "linux")]
                {
                    let trash_path = dirs::home_dir()
                        .map(|h| h.join(".local/share/Trash"))
                        .ok_or("Could not find home directory")?;
                    if trash_path.exists() {
                        std::fs::remove_dir_all(&trash_path)
                            .map_err(|e| format!("Failed to empty trash: {}", e))?;
                        std::fs::create_dir_all(trash_path.join("files"))
                            .map_err(|e| format!("Failed to recreate trash: {}", e))?;
                        std::fs::create_dir_all(trash_path.join("info"))
                            .map_err(|e| format!("Failed to recreate trash: {}", e))?;
                    }
                }
                #[cfg(target_os = "macos")]
                {
                    std::process::Command::new("osascript")
                        .args(["-e", "tell app \"Finder\" to empty trash"])
                        .spawn()
                        .map_err(|e| format!("Failed to empty trash: {}", e))?;
                }
                #[cfg(target_os = "windows")]
                {
                    std::process::Command::new("cmd")
                        .args(["/C", "rd", "/s", "/q", "%SYSTEMDRIVE%\\$Recycle.Bin"])
                        .spawn()
                        .map_err(|e| format!("Failed to empty recycle bin: {}", e))?;
                }
            }
            _ => return Err(format!("Unknown system command: {}", cmd_id)),
        }

        Ok(())
    }
}

