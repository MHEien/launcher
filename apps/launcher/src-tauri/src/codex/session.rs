use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::sync::Arc;
use std::thread;
use tokio::sync::{mpsc, Mutex};

/// A Codex chat session with PTY support (thread-safe)
pub struct CodexSession {
    /// Unique session ID
    pub id: String,
    /// Working directory for this session
    pub working_dir: PathBuf,
    /// Session state
    state: Arc<Mutex<SessionState>>,
    /// Writer to send input to the PTY (protected by mutex for thread safety)
    writer: Arc<Mutex<Option<Box<dyn Write + Send>>>>,
    /// Channel sender for output
    output_tx: Arc<Mutex<Option<mpsc::Sender<SessionMessage>>>>,
    /// Channel receiver for output (protected by mutex)
    output_rx: Arc<Mutex<Option<mpsc::Receiver<SessionMessage>>>>,
}

/// State of a Codex session
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SessionState {
    /// Session created but not started
    Created,
    /// Session is active and running
    Running,
    /// Session is paused/idle
    Idle,
    /// Session has ended
    Ended,
}

/// A message in a Codex session (for serialization to frontend)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMessage {
    /// Message ID
    pub id: String,
    /// Message type
    #[serde(rename = "type")]
    pub msg_type: MessageType,
    /// Message content
    pub content: String,
    /// Timestamp
    pub timestamp: i64,
    /// Additional metadata
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<MessageMetadata>,
}

/// Type of message in the session
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MessageType {
    /// User input
    User,
    /// AI response text
    Assistant,
    /// System message
    System,
    /// Code block
    Code,
    /// File operation
    FileOperation,
    /// Command execution
    Command,
    /// Error message
    Error,
    /// Approval request
    ApprovalRequest,
    /// Raw output from PTY
    Output,
}

/// Additional metadata for messages
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageMetadata {
    /// Language for code blocks
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    /// File path for file operations
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_path: Option<String>,
    /// Operation type for file operations
    #[serde(skip_serializing_if = "Option::is_none")]
    pub operation: Option<FileOperation>,
    /// Command being executed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,
    /// Exit code for commands
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exit_code: Option<i32>,
    /// Approval ID for approval requests
    #[serde(skip_serializing_if = "Option::is_none")]
    pub approval_id: Option<String>,
}

/// File operation types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FileOperation {
    Create,
    Modify,
    Delete,
    Read,
}

impl CodexSession {
    /// Create a new session (not yet started)
    pub fn new(working_dir: &str) -> Result<Self, String> {
        let path = PathBuf::from(working_dir);

        // Validate the working directory exists
        if !path.exists() {
            return Err(format!(
                "Working directory does not exist: {}",
                working_dir
            ));
        }

        if !path.is_dir() {
            return Err(format!("Path is not a directory: {}", working_dir));
        }

        Ok(Self {
            id: generate_session_id(),
            working_dir: path,
            state: Arc::new(Mutex::new(SessionState::Created)),
            writer: Arc::new(Mutex::new(None)),
            output_tx: Arc::new(Mutex::new(None)),
            output_rx: Arc::new(Mutex::new(None)),
        })
    }

    /// Start the Codex session with PTY
    pub fn start(&self) -> Result<(), String> {
        // Check current state
        {
            let state = self.state.blocking_lock();
            if *state == SessionState::Running {
                return Err("Session is already running".to_string());
            }
        }

        // Create PTY system
        let pty_system = native_pty_system();

        // Create PTY with reasonable size
        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {}", e))?;

        // Build command to run codex
        let mut cmd = CommandBuilder::new("codex");
        cmd.cwd(&self.working_dir);

        // Spawn the codex process in the PTY
        let mut child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn codex: {}", e))?;

        // Get the writer for sending input
        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to get PTY writer: {}", e))?;

        // Get the reader for receiving output
        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to get PTY reader: {}", e))?;

        // Create channel for output messages
        let (tx, rx) = mpsc::channel::<SessionMessage>(100);

        // Store writer and channels
        {
            *self.writer.blocking_lock() = Some(writer);
            *self.output_tx.blocking_lock() = Some(tx.clone());
            *self.output_rx.blocking_lock() = Some(rx);
        }

        // Spawn thread to read PTY output
        let session_id = self.id.clone();
        let state_clone = Arc::clone(&self.state);
        
        thread::spawn(move || {
            let buf_reader = BufReader::new(reader);

            for line in buf_reader.lines() {
                match line {
                    Ok(line) => {
                        // Parse the line and create appropriate message type
                        let message = parse_codex_output(&line, &session_id);
                        if tx.blocking_send(message).is_err() {
                            // Channel closed, stop reading
                            break;
                        }
                    }
                    Err(e) => {
                        eprintln!("Error reading PTY output: {}", e);
                        break;
                    }
                }
            }

            // Wait for the child process to exit
            let _ = child.wait();
            
            // Update state to ended
            if let Ok(mut state) = state_clone.try_lock() {
                *state = SessionState::Ended;
            }
        });

        // Update state to running
        *self.state.blocking_lock() = SessionState::Running;

        Ok(())
    }

    /// Send a message to the Codex session
    pub async fn send_message(&self, message: &str) -> Result<(), String> {
        {
            let state = self.state.lock().await;
            if *state != SessionState::Running {
                return Err("Session is not running".to_string());
            }
        }

        let mut writer_guard = self.writer.lock().await;
        let writer = writer_guard
            .as_mut()
            .ok_or_else(|| "No writer available".to_string())?;

        // Send the message followed by newline
        writeln!(writer, "{}", message).map_err(|e| format!("Failed to send message: {}", e))?;

        writer
            .flush()
            .map_err(|e| format!("Failed to flush: {}", e))?;

        Ok(())
    }

    /// Send a raw key/input to the session (for special keys like Ctrl+C)
    pub async fn send_raw(&self, data: &[u8]) -> Result<(), String> {
        {
            let state = self.state.lock().await;
            if *state != SessionState::Running {
                return Err("Session is not running".to_string());
            }
        }

        let mut writer_guard = self.writer.lock().await;
        let writer = writer_guard
            .as_mut()
            .ok_or_else(|| "No writer available".to_string())?;

        writer
            .write_all(data)
            .map_err(|e| format!("Failed to send raw data: {}", e))?;

        writer
            .flush()
            .map_err(|e| format!("Failed to flush: {}", e))?;

        Ok(())
    }

    /// Try to receive the next output message (non-blocking)
    pub async fn try_recv(&self) -> Option<SessionMessage> {
        let mut rx_guard = self.output_rx.lock().await;
        if let Some(rx) = rx_guard.as_mut() {
            rx.try_recv().ok()
        } else {
            None
        }
    }

    /// Receive the next output message (blocking)
    pub async fn recv(&self) -> Option<SessionMessage> {
        let mut rx_guard = self.output_rx.lock().await;
        if let Some(rx) = rx_guard.as_mut() {
            rx.recv().await
        } else {
            None
        }
    }

    /// Stop the session
    pub async fn stop(&self) -> Result<(), String> {
        {
            let state = self.state.lock().await;
            if *state != SessionState::Running {
                return Ok(());
            }
        }

        // Send Ctrl+C to gracefully stop
        {
            let mut writer_guard = self.writer.lock().await;
            if let Some(writer) = writer_guard.as_mut() {
                let _ = writer.write_all(&[0x03]); // Ctrl+C
                let _ = writer.flush();
            }
        }

        // Clear channels and writer
        *self.output_tx.lock().await = None;
        *self.output_rx.lock().await = None;
        *self.writer.lock().await = None;
        *self.state.lock().await = SessionState::Ended;

        Ok(())
    }

    /// Get session info for frontend
    pub fn info(&self) -> SessionInfo {
        let state = self.state.blocking_lock().clone();
        SessionInfo {
            id: self.id.clone(),
            working_dir: self.working_dir.to_string_lossy().to_string(),
            state,
        }
    }

    /// Get current state
    pub async fn get_state(&self) -> SessionState {
        self.state.lock().await.clone()
    }

    /// Check if session is running
    pub async fn is_running(&self) -> bool {
        *self.state.lock().await == SessionState::Running
    }
}

// Implement Clone for CodexSession (creates a reference to the same session)
impl Clone for CodexSession {
    fn clone(&self) -> Self {
        Self {
            id: self.id.clone(),
            working_dir: self.working_dir.clone(),
            state: Arc::clone(&self.state),
            writer: Arc::clone(&self.writer),
            output_tx: Arc::clone(&self.output_tx),
            output_rx: Arc::clone(&self.output_rx),
        }
    }
}

/// Session info for frontend serialization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    pub id: String,
    pub working_dir: String,
    pub state: SessionState,
}

/// Parse Codex CLI output and create appropriate message type
fn parse_codex_output(line: &str, _session_id: &str) -> SessionMessage {
    // TODO: Parse Codex output format to identify:
    // - Code blocks (```language ... ```)
    // - File operations (Created/Modified/Deleted file.txt)
    // - Command executions ($ command)
    // - Approval requests
    // For now, return as raw output

    // Check for common patterns
    if line.starts_with("```") {
        // Code block start/end
        let language = line.strip_prefix("```").map(|s| s.to_string());
        return SessionMessage::code(String::new(), language);
    }

    if line.contains("Created ") || line.contains("Modified ") || line.contains("Deleted ") {
        // Potential file operation
        return SessionMessage::output(line.to_string());
    }

    if line.starts_with("$ ") || line.starts_with("> ") {
        // Command execution
        let command = line
            .strip_prefix("$ ")
            .or_else(|| line.strip_prefix("> "))
            .unwrap_or(line);
        return SessionMessage::command(command.to_string(), String::new(), None);
    }

    // Default to output message
    SessionMessage::output(line.to_string())
}

/// Generate a unique session ID
fn generate_session_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let random: u32 = rand::random();
    format!("codex-{}-{:x}", timestamp, random)
}

impl SessionMessage {
    /// Create a new user message
    pub fn user(content: String) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::User,
            content,
            timestamp: current_timestamp(),
            metadata: None,
        }
    }

    /// Create a new assistant message
    pub fn assistant(content: String) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::Assistant,
            content,
            timestamp: current_timestamp(),
            metadata: None,
        }
    }

    /// Create a system message
    pub fn system(content: String) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::System,
            content,
            timestamp: current_timestamp(),
            metadata: None,
        }
    }

    /// Create an output message (raw PTY output)
    pub fn output(content: String) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::Output,
            content,
            timestamp: current_timestamp(),
            metadata: None,
        }
    }

    /// Create a code block message
    pub fn code(content: String, language: Option<String>) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::Code,
            content,
            timestamp: current_timestamp(),
            metadata: Some(MessageMetadata {
                language,
                file_path: None,
                operation: None,
                command: None,
                exit_code: None,
                approval_id: None,
            }),
        }
    }

    /// Create a file operation message
    pub fn file_operation(file_path: String, operation: FileOperation, content: String) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::FileOperation,
            content,
            timestamp: current_timestamp(),
            metadata: Some(MessageMetadata {
                language: None,
                file_path: Some(file_path),
                operation: Some(operation),
                command: None,
                exit_code: None,
                approval_id: None,
            }),
        }
    }

    /// Create a command message
    pub fn command(command: String, output: String, exit_code: Option<i32>) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::Command,
            content: output,
            timestamp: current_timestamp(),
            metadata: Some(MessageMetadata {
                language: None,
                file_path: None,
                operation: None,
                command: Some(command),
                exit_code,
                approval_id: None,
            }),
        }
    }

    /// Create an error message
    pub fn error(content: String) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::Error,
            content,
            timestamp: current_timestamp(),
            metadata: None,
        }
    }

    /// Create an approval request message
    pub fn approval_request(content: String, approval_id: String) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::ApprovalRequest,
            content,
            timestamp: current_timestamp(),
            metadata: Some(MessageMetadata {
                language: None,
                file_path: None,
                operation: None,
                command: None,
                exit_code: None,
                approval_id: Some(approval_id),
            }),
        }
    }
}

/// Generate a unique message ID
fn generate_message_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_micros();
    let random: u16 = rand::random();
    format!("msg-{}-{:x}", timestamp, random)
}

/// Get current timestamp in milliseconds
fn current_timestamp() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}
