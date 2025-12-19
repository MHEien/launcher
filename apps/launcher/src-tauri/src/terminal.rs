//! Terminal widget PTY management
//!
//! Provides cross-platform terminal support using portable-pty.

use parking_lot::Mutex;
use portable_pty::{native_pty_system, CommandBuilder, PtyPair, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use std::thread;
use tauri::{AppHandle, Emitter};

/// Terminal session ID
pub type TerminalId = String;

/// A single terminal session
struct TerminalSession {
    pty_pair: PtyPair,
    writer: Box<dyn Write + Send>,
    _reader_thread: thread::JoinHandle<()>,
}

/// Manages multiple terminal sessions
pub struct TerminalManager {
    sessions: Mutex<HashMap<TerminalId, TerminalSession>>,
    app_handle: Mutex<Option<AppHandle>>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            app_handle: Mutex::new(None),
        }
    }

    /// Set the app handle for emitting events
    pub fn set_app_handle(&self, handle: AppHandle) {
        *self.app_handle.lock() = Some(handle);
    }

    /// Get the default shell for the current platform
    fn get_default_shell() -> String {
        #[cfg(target_os = "windows")]
        {
            // Try PowerShell first, fall back to cmd
            if std::path::Path::new(
                "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
            )
            .exists()
            {
                "powershell.exe".to_string()
            } else {
                "cmd.exe".to_string()
            }
        }

        #[cfg(target_os = "macos")]
        {
            std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
        }

        #[cfg(target_os = "linux")]
        {
            std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            "/bin/sh".to_string()
        }
    }

    /// Spawn a new terminal session
    pub fn spawn_terminal(
        &self,
        id: TerminalId,
        cols: u16,
        rows: u16,
        cwd: Option<String>,
    ) -> Result<(), String> {
        // Check if session already exists
        if self.sessions.lock().contains_key(&id) {
            return Err(format!("Terminal session '{}' already exists", id));
        }

        let pty_system = native_pty_system();

        let pty_pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {}", e))?;

        let shell = Self::get_default_shell();
        let mut cmd = CommandBuilder::new(&shell);

        // Set working directory if specified
        if let Some(dir) = cwd {
            cmd.cwd(dir);
        } else if let Some(home) = dirs::home_dir() {
            cmd.cwd(home);
        }

        // Spawn the shell
        let mut child = pty_pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn shell: {}", e))?;

        // Get writer for sending input
        let writer = pty_pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to get PTY writer: {}", e))?;

        // Get reader for receiving output
        let mut reader = pty_pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to get PTY reader: {}", e))?;

        // Clone app handle and terminal ID for the reader thread
        let app_handle = self.app_handle.lock().clone();
        let terminal_id = id.clone();

        // Spawn reader thread to forward output to frontend
        let reader_thread = thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => {
                        // EOF - terminal closed
                        if let Some(handle) = &app_handle {
                            let _ = handle.emit(&format!("terminal-closed-{}", terminal_id), ());
                        }
                        break;
                    }
                    Ok(n) => {
                        let data = &buf[..n];
                        // Convert to string (lossy for non-UTF8 sequences)
                        let output = String::from_utf8_lossy(data).to_string();

                        if let Some(handle) = &app_handle {
                            let _ =
                                handle.emit(&format!("terminal-output-{}", terminal_id), output);
                        }
                    }
                    Err(e) => {
                        eprintln!("Terminal read error: {}", e);
                        if let Some(handle) = &app_handle {
                            let _ = handle
                                .emit(&format!("terminal-error-{}", terminal_id), e.to_string());
                        }
                        break;
                    }
                }
            }

            // Wait for child to exit
            let _ = child.wait();
        });

        // Store the session
        let session = TerminalSession {
            pty_pair,
            writer,
            _reader_thread: reader_thread,
        };

        self.sessions.lock().insert(id, session);

        Ok(())
    }

    /// Write input to a terminal session
    pub fn write_to_terminal(&self, id: &str, data: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock();
        let session = sessions
            .get_mut(id)
            .ok_or_else(|| format!("Terminal session '{}' not found", id))?;

        session
            .writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("Failed to write to terminal: {}", e))?;

        session
            .writer
            .flush()
            .map_err(|e| format!("Failed to flush terminal: {}", e))?;

        Ok(())
    }

    /// Resize a terminal session
    pub fn resize_terminal(&self, id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let sessions = self.sessions.lock();
        let session = sessions
            .get(id)
            .ok_or_else(|| format!("Terminal session '{}' not found", id))?;

        session
            .pty_pair
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to resize terminal: {}", e))?;

        Ok(())
    }

    /// Close a terminal session
    pub fn close_terminal(&self, id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock();

        if sessions.remove(id).is_some() {
            Ok(())
        } else {
            Err(format!("Terminal session '{}' not found", id))
        }
    }

    /// Check if a terminal session exists
    pub fn has_terminal(&self, id: &str) -> bool {
        self.sessions.lock().contains_key(id)
    }

    /// Get list of active terminal IDs
    pub fn list_terminals(&self) -> Vec<TerminalId> {
        self.sessions.lock().keys().cloned().collect()
    }
}

impl Default for TerminalManager {
    fn default() -> Self {
        Self::new()
    }
}
