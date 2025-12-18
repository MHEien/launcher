use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use std::thread;
use tokio::sync::{mpsc, Mutex, RwLock};

/// A Codex chat session using `codex exec --json` for structured output
pub struct CodexSession {
    /// Unique session ID (local)
    pub id: String,
    /// Codex thread ID (for resume capability)
    pub thread_id: Arc<RwLock<Option<String>>>,
    /// Working directory for this session
    pub working_dir: PathBuf,
    /// Session state
    state: Arc<Mutex<SessionState>>,
    /// Current child process (if running)
    process: Arc<Mutex<Option<Child>>>,
    /// Channel sender for output messages
    output_tx: Arc<Mutex<Option<mpsc::Sender<SessionMessage>>>>,
    /// Channel receiver for output messages
    output_rx: Arc<Mutex<Option<mpsc::Receiver<SessionMessage>>>>,
    /// Conversation history for context
    history: Arc<RwLock<Vec<HistoryEntry>>>,
}

/// Entry in conversation history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub role: String,
    pub content: String,
    pub timestamp: i64,
}

/// State of a Codex session
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SessionState {
    Created,
    Running,
    Idle,
    Ended,
}

/// A message in a Codex session (for frontend)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMessage {
    pub id: String,
    #[serde(rename = "type")]
    pub msg_type: MessageType,
    pub content: String,
    pub timestamp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<MessageMetadata>,
}

/// Type of message in the session
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MessageType {
    User,
    Assistant,
    System,
    Thinking,        // Codex reasoning (shown as "thinking...")
    Command,         // Command being executed
    CommandOutput,   // Output from a command
    FileOperation,   // File created/modified/deleted
    Error,
    PreviewSuggestion,
    Progress,        // Progress indicator
}

/// Additional metadata for messages
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageMetadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub operation: Option<FileOperation>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exit_code: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggested_command: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub framework: Option<String>,
    /// User-friendly description of what's happening
    #[serde(skip_serializing_if = "Option::is_none")]
    pub friendly_description: Option<String>,
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

/// Codex JSONL event types
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type")]
enum CodexEvent {
    #[serde(rename = "thread.started")]
    ThreadStarted { thread_id: String },
    
    #[serde(rename = "turn.started")]
    TurnStarted,
    
    #[serde(rename = "turn.completed")]
    TurnCompleted { usage: Option<serde_json::Value> },
    
    #[serde(rename = "item.started")]
    ItemStarted { item: CodexItem },
    
    #[serde(rename = "item.completed")]
    ItemCompleted { item: CodexItem },
    
    #[serde(rename = "error")]
    Error { message: String },
}

/// Codex item types from JSONL
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type")]
enum CodexItem {
    #[serde(rename = "agent_message")]
    AgentMessage {
        id: String,
        text: String,
    },
    
    #[serde(rename = "reasoning")]
    Reasoning {
        id: String,
        text: String,
    },
    
    #[serde(rename = "command_execution")]
    CommandExecution {
        id: String,
        command: String,
        #[serde(default)]
        aggregated_output: String,
        #[serde(default)]
        exit_code: Option<i32>,
        #[serde(default)]
        status: String,
    },
    
    #[serde(rename = "file_edit")]
    FileEdit {
        id: String,
        #[serde(default)]
        file_path: String,
        #[serde(default)]
        status: String,
    },
    
    #[serde(other)]
    Unknown,
}

impl CodexSession {
    /// Create a new session
    pub fn new(working_dir: &str) -> Result<Self, String> {
        let path = PathBuf::from(working_dir);

        if !path.exists() {
            return Err(format!("Working directory does not exist: {}", working_dir));
        }

        if !path.is_dir() {
            return Err(format!("Path is not a directory: {}", working_dir));
        }

        Ok(Self {
            id: generate_session_id(),
            thread_id: Arc::new(RwLock::new(None)),
            working_dir: path,
            state: Arc::new(Mutex::new(SessionState::Created)),
            process: Arc::new(Mutex::new(None)),
            output_tx: Arc::new(Mutex::new(None)),
            output_rx: Arc::new(Mutex::new(None)),
            history: Arc::new(RwLock::new(Vec::new())),
        })
    }

    /// Send a message to Codex and get responses
    pub async fn send_message(&self, user_message: &str) -> Result<(), String> {
        // Add to history
        {
            let mut history = self.history.write().await;
            history.push(HistoryEntry {
                role: "user".to_string(),
                content: user_message.to_string(),
                timestamp: current_timestamp(),
            });
        }

        // Create message channel
        let (tx, rx) = mpsc::channel::<SessionMessage>(100);
        *self.output_tx.lock().await = Some(tx.clone());
        *self.output_rx.lock().await = Some(rx);
        *self.state.lock().await = SessionState::Running;

        // Build the prompt with context
        let prompt = self.build_prompt(user_message).await;
        let working_dir = self.working_dir.clone();
        let thread_id_arc = Arc::clone(&self.thread_id);
        let state_arc = Arc::clone(&self.state);
        let history_arc = Arc::clone(&self.history);
        let process_arc = Arc::clone(&self.process);

        // Spawn the codex exec process
        thread::spawn(move || {
            let result = run_codex_exec(&working_dir, &prompt, tx.clone(), thread_id_arc, history_arc);
            
            if let Err(e) = result {
                let _ = tx.blocking_send(SessionMessage::error(format!("Codex error: {}", e)));
            }

            // Update state
            let rt = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build();
            if let Ok(rt) = rt {
                rt.block_on(async {
                    *state_arc.lock().await = SessionState::Idle;
                    *process_arc.lock().await = None;
                });
            }
        });

        Ok(())
    }

    /// Build the prompt with system context
    async fn build_prompt(&self, user_message: &str) -> String {
        let history = self.history.read().await;
        
        // Build context from history
        let mut context = String::new();
        if history.len() > 1 {
            context.push_str("Previous conversation:\n");
            for entry in history.iter().take(history.len() - 1).rev().take(5).rev() {
                context.push_str(&format!("{}: {}\n", entry.role, entry.content));
            }
            context.push_str("\n");
        }

        // System instructions for user-friendly behavior and direct action
        let system_prompt = r#"You are helping a non-technical user build software. CRITICAL RULES:

1. ACT DIRECTLY - Don't scan for existing files or check configurations first. Just create what's needed.
2. ALWAYS USE BUN - Use bun instead of npm/npx/pnpm for ALL operations (install, run, create, etc.)
3. EXPLAIN SIMPLY - Use plain language, avoid jargon. Say "Installing..." not "Running bun install..."
4. FIX ERRORS SILENTLY - If something fails, fix it automatically without explaining technical details.
5. COMPLETE THE TASK - Don't stop halfway. Create a fully working project.
6. SUMMARIZE AT END - Tell the user what was created and how to use it.

For ALL JavaScript/TypeScript projects:
- ALWAYS use bun, NEVER npm, npx, or pnpm
- Use `bun create next-app . --typescript --no-react-compiler --tailwind --eslint --app --no-src-dir --import-alias "@/*"` for Next.js
- Use `bun create vite . --template react-ts` for React+Vite
- Use `bun install` instead of `npm install`
- Use `bun run dev` instead of `npm run dev`
- After creation, mention the user can preview it with the Preview button.

START IMMEDIATELY - Don't ask questions, just build what's requested.

"#;

        format!("{}{}{}", system_prompt, context, user_message)
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

    /// Stop the session
    pub async fn stop(&self) -> Result<(), String> {
        // Kill the process if running
        if let Some(mut child) = self.process.lock().await.take() {
            let _ = child.kill();
        }

        *self.output_tx.lock().await = None;
        *self.output_rx.lock().await = None;
        *self.state.lock().await = SessionState::Ended;

        Ok(())
    }

    /// Get session info
    pub async fn info(&self) -> SessionInfo {
        SessionInfo {
            id: self.id.clone(),
            thread_id: self.thread_id.read().await.clone(),
            working_dir: self.working_dir.to_string_lossy().to_string(),
            state: self.state.lock().await.clone(),
        }
    }

    /// Get current state
    pub async fn get_state(&self) -> SessionState {
        self.state.lock().await.clone()
    }

    /// Get conversation history
    pub async fn get_history(&self) -> Vec<HistoryEntry> {
        self.history.read().await.clone()
    }
}

impl Clone for CodexSession {
    fn clone(&self) -> Self {
        Self {
            id: self.id.clone(),
            thread_id: Arc::clone(&self.thread_id),
            working_dir: self.working_dir.clone(),
            state: Arc::clone(&self.state),
            process: Arc::clone(&self.process),
            output_tx: Arc::clone(&self.output_tx),
            output_rx: Arc::clone(&self.output_rx),
            history: Arc::clone(&self.history),
        }
    }
}

/// Session info for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    pub id: String,
    pub thread_id: Option<String>,
    pub working_dir: String,
    pub state: SessionState,
}

/// Run codex exec and parse JSONL output
fn run_codex_exec(
    working_dir: &PathBuf,
    prompt: &str,
    tx: mpsc::Sender<SessionMessage>,
    thread_id_arc: Arc<RwLock<Option<String>>>,
    history_arc: Arc<RwLock<Vec<HistoryEntry>>>,
) -> Result<(), String> {
    // Log for debugging
    eprintln!("[Codex] Starting exec in: {}", working_dir.display());
    eprintln!("[Codex] Prompt length: {} chars", prompt.len());

    // Build command with full access to the selected folder
    // Since the user explicitly selected a folder, we trust it for file operations
    // Note: codex exec doesn't support -a flag, it runs non-interactively by default
    let mut cmd = Command::new("codex");
    cmd.args([
        "exec",
        "--json",
        "--skip-git-repo-check",
        // Use danger-full-access sandbox since user selected this specific folder
        "--sandbox", "danger-full-access",
        "-C",
        &working_dir.to_string_lossy(),
        // Use "-" to read prompt from stdin (avoids command line length limits)
        "-",
    ]);
    
    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to start codex: {}", e))?;
    
    // Write prompt to stdin
    {
        let stdin = child.stdin.as_mut().ok_or("Failed to get stdin")?;
        use std::io::Write;
        stdin.write_all(prompt.as_bytes()).map_err(|e| format!("Failed to write prompt: {}", e))?;
        // Drop stdin to close it and signal EOF
    }
    // Explicitly drop stdin by taking it
    drop(child.stdin.take());

    eprintln!("[Codex] Process started, reading output...");
    
    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take();
    
    // Spawn a thread to read stderr for error messages
    let stderr_tx = tx.clone();
    if let Some(stderr) = stderr {
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines().flatten() {
                eprintln!("[Codex STDERR] {}", line);
                // Send important errors to the UI
                if line.contains("error") || line.contains("Error") || line.contains("ERROR") {
                    let _ = stderr_tx.blocking_send(SessionMessage::error(line));
                }
            }
        });
    }
    
    let reader = BufReader::new(stdout);

    let mut assistant_response = String::new();

    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(e) => {
                eprintln!("[Codex] Error reading line: {}", e);
                continue;
            }
        };

        // Log raw output for debugging
        eprintln!("[Codex] Raw: {}", &line[..line.len().min(200)]);

        // Skip empty lines and non-JSON
        if line.trim().is_empty() || !line.trim().starts_with('{') {
            continue;
        }

        // Parse JSONL event
        let event: Result<CodexEvent, _> = serde_json::from_str(&line);
        
        match event {
            Ok(CodexEvent::ThreadStarted { thread_id }) => {
                eprintln!("[Codex] Thread started: {}", thread_id);
                // Store thread ID for resume capability
                let rt = tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build();
                if let Ok(rt) = rt {
                    rt.block_on(async {
                        *thread_id_arc.write().await = Some(thread_id);
                    });
                }
            }
            
            Ok(CodexEvent::TurnStarted) => {
                let _ = tx.blocking_send(SessionMessage::progress("Working on your request...".to_string()));
            }
            
            Ok(CodexEvent::TurnCompleted { .. }) => {
                // Turn completed, store assistant response in history
                if !assistant_response.is_empty() {
                    let rt = tokio::runtime::Builder::new_current_thread()
                        .enable_all()
                        .build();
                    if let Ok(rt) = rt {
                        rt.block_on(async {
                            history_arc.write().await.push(HistoryEntry {
                                role: "assistant".to_string(),
                                content: assistant_response.clone(),
                                timestamp: current_timestamp(),
                            });
                        });
                    }
                }
            }
            
            Ok(CodexEvent::ItemStarted { item }) => {
                match item {
                    CodexItem::CommandExecution { command, .. } => {
                        let friendly = get_friendly_command_description(&command);
                        let _ = tx.blocking_send(SessionMessage::command_started(command, friendly));
                    }
                    _ => {}
                }
            }
            
            Ok(CodexEvent::ItemCompleted { item }) => {
                match item {
                    CodexItem::AgentMessage { text, .. } => {
                        assistant_response.push_str(&text);
                        assistant_response.push('\n');
                        
                        // Check for preview suggestions in the text
                        if let Some(suggestion) = detect_preview_suggestion(&text) {
                            let _ = tx.blocking_send(suggestion);
                        }
                        
                        let _ = tx.blocking_send(SessionMessage::assistant(text));
                    }
                    
                    CodexItem::Reasoning { text, .. } => {
                        // Convert reasoning to user-friendly "thinking" message
                        let friendly = summarize_reasoning(&text);
                        let _ = tx.blocking_send(SessionMessage::thinking(friendly));
                    }
                    
                    CodexItem::CommandExecution { command, aggregated_output, exit_code, status, .. } => {
                        let friendly = get_friendly_command_result(&command, exit_code, &status);
                        let _ = tx.blocking_send(SessionMessage::command_completed(
                            command,
                            aggregated_output,
                            exit_code,
                            friendly,
                        ));
                    }
                    
                    CodexItem::FileEdit { file_path, status, .. } => {
                        let operation = if status.contains("create") {
                            FileOperation::Create
                        } else if status.contains("delete") {
                            FileOperation::Delete
                        } else {
                            FileOperation::Modify
                        };
                        let friendly = get_friendly_file_operation(&file_path, &operation);
                        let _ = tx.blocking_send(SessionMessage::file_operation(file_path, operation, friendly));
                    }
                    
                    CodexItem::Unknown => {}
                }
            }
            
            Ok(CodexEvent::Error { message }) => {
                // Don't show MCP errors to user (they're internal)
                if !message.contains("MCP client") {
                    let _ = tx.blocking_send(SessionMessage::error(message));
                }
            }
            
            Err(e) => {
                eprintln!("[Codex] Failed to parse JSONL: {} - line: {}", e, line);
            }
        }
    }

    // Wait for process to complete and capture exit status
    match child.wait() {
        Ok(status) => {
            eprintln!("[Codex] Process exited with status: {}", status);
            if !status.success() {
                // Try to read stderr for error details
                let _ = tx.blocking_send(SessionMessage::error(
                    format!("Codex exited with error code: {}", status)
                ));
            }
        }
        Err(e) => {
            eprintln!("[Codex] Failed to wait for process: {}", e);
            let _ = tx.blocking_send(SessionMessage::error(format!("Process error: {}", e)));
        }
    }
    
    eprintln!("[Codex] Execution complete");
    Ok(())
}

/// Get a user-friendly description of a command
fn get_friendly_command_description(command: &str) -> String {
    let cmd_lower = command.to_lowercase();
    
    if cmd_lower.starts_with("npm install") || cmd_lower.starts_with("npm i ") || cmd_lower.contains("npm install") {
        "Installing project packages...".to_string()
    } else if cmd_lower.starts_with("npm run") {
        "Running a task...".to_string()
    } else if cmd_lower.contains("create-next-app") {
        "Creating your Next.js app...".to_string()
    } else if cmd_lower.contains("create-react-app") || cmd_lower.contains("create vite") {
        "Creating your React app...".to_string()
    } else if cmd_lower.starts_with("npx ") {
        "Setting up your project...".to_string()
    } else if cmd_lower.starts_with("git init") {
        "Initializing project...".to_string()
    } else if cmd_lower.starts_with("git ") {
        "Saving your work...".to_string()
    } else if cmd_lower.starts_with("mkdir") {
        "Creating folders...".to_string()
    } else if cmd_lower.starts_with("cd ") {
        "Opening folder...".to_string()
    } else if cmd_lower.starts_with("ls") || cmd_lower.starts_with("dir") || cmd_lower.starts_with("rg ") {
        "Looking at files...".to_string()
    } else if cmd_lower.starts_with("cat ") || cmd_lower.starts_with("type ") {
        "Reading a file...".to_string()
    } else if cmd_lower.starts_with("pwd") {
        "Checking location...".to_string()
    } else if cmd_lower.starts_with("echo ") {
        "Writing content...".to_string()
    } else {
        "Working...".to_string()
    }
}

/// Get a user-friendly result description
fn get_friendly_command_result(command: &str, exit_code: Option<i32>, status: &str) -> String {
    let success = exit_code.map(|c| c == 0).unwrap_or(status == "completed");
    let cmd_lower = command.to_lowercase();
    
    if success {
        if cmd_lower.starts_with("npm install") || cmd_lower.contains("npm install") {
            "Packages installed!".to_string()
        } else if cmd_lower.contains("create-next-app") {
            "Next.js app created!".to_string()
        } else if cmd_lower.contains("create-react-app") || cmd_lower.contains("create vite") {
            "React app created!".to_string()
        } else if cmd_lower.starts_with("npx ") {
            "Setup complete!".to_string()
        } else if cmd_lower.starts_with("ls") || cmd_lower.starts_with("dir") || cmd_lower.starts_with("pwd") || cmd_lower.starts_with("rg ") {
            "Done".to_string()
        } else {
            "Done!".to_string()
        }
    } else {
        // Don't alarm the user, just say we're working on it
        "Working on it...".to_string()
    }
}

/// Get a user-friendly file operation description
fn get_friendly_file_operation(file_path: &str, operation: &FileOperation) -> String {
    let file_name = PathBuf::from(file_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| file_path.to_string());
    
    match operation {
        FileOperation::Create => format!("Created: {}", file_name),
        FileOperation::Modify => format!("Updated: {}", file_name),
        FileOperation::Delete => format!("Removed: {}", file_name),
        FileOperation::Read => format!("Read: {}", file_name),
    }
}

/// Summarize reasoning into user-friendly text
fn summarize_reasoning(text: &str) -> String {
    let text_lower = text.to_lowercase();
    
    if text_lower.contains("creating") || text_lower.contains("create") || text_lower.contains("setting up") {
        "Setting up your project...".to_string()
    } else if text_lower.contains("install") {
        "Getting ready to install...".to_string()
    } else if text_lower.contains("error") || text_lower.contains("fix") || text_lower.contains("debug") || text_lower.contains("issue") {
        "Fixing something...".to_string()
    } else if text_lower.contains("check") || text_lower.contains("verify") || text_lower.contains("inspect") {
        "Checking things...".to_string()
    } else if text_lower.contains("config") || text_lower.contains("setting") {
        "Configuring...".to_string()
    } else if text_lower.contains("next") || text_lower.contains("react") || text_lower.contains("app") {
        "Building your app...".to_string()
    } else {
        "Working...".to_string()
    }
}

/// Detect preview suggestions in Codex output
fn detect_preview_suggestion(text: &str) -> Option<SessionMessage> {
    let text_lower = text.to_lowercase();
    
    // Detect dev commands - prioritize bun, but recognize all package managers
    let dev_commands = [
        ("bun run dev", "bun run dev", "Next.js"),
        ("bun dev", "bun dev", "Next.js"),
        ("bun start", "bun start", "React"),
        ("npm run dev", "bun run dev", "Next.js"),  // Suggest bun even if npm mentioned
        ("npm start", "bun start", "React"),
        ("yarn dev", "bun run dev", "Vite"),
        ("pnpm dev", "bun run dev", "Vite"),
    ];

    for (pattern, command, framework) in dev_commands {
        if text_lower.contains(pattern) || text.contains(&format!("`{}`", pattern)) {
            return Some(SessionMessage::preview_suggestion(
                format!("Your {} app is ready to preview!", framework),
                command.to_string(),
                framework.to_string(),
            ));
        }
    }

    // Check for completion indicators - always suggest bun
    let completion_phrases = [
        "project is ready",
        "you can now run",
        "ready to use",
        "setup complete",
        "successfully created",
    ];

    for phrase in completion_phrases {
        if text_lower.contains(phrase) {
            return Some(SessionMessage::preview_suggestion(
                "Your project is ready!".to_string(),
                "bun run dev".to_string(),
                "Project".to_string(),
            ));
        }
    }

    None
}

impl SessionMessage {
    pub fn user(content: String) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::User,
            content,
            timestamp: current_timestamp(),
            metadata: None,
        }
    }

    pub fn assistant(content: String) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::Assistant,
            content,
            timestamp: current_timestamp(),
            metadata: None,
        }
    }

    pub fn thinking(content: String) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::Thinking,
            content,
            timestamp: current_timestamp(),
            metadata: None,
        }
    }

    pub fn progress(content: String) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::Progress,
            content,
            timestamp: current_timestamp(),
            metadata: None,
        }
    }

    pub fn command_started(command: String, friendly_description: String) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::Command,
            content: friendly_description.clone(),
            timestamp: current_timestamp(),
            metadata: Some(MessageMetadata {
                language: None,
                file_path: None,
                operation: None,
                command: Some(command),
                exit_code: None,
                status: Some("in_progress".to_string()),
                suggested_command: None,
                framework: None,
                friendly_description: Some(friendly_description),
            }),
        }
    }

    pub fn command_completed(command: String, output: String, exit_code: Option<i32>, friendly_description: String) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::CommandOutput,
            content: output,
            timestamp: current_timestamp(),
            metadata: Some(MessageMetadata {
                language: None,
                file_path: None,
                operation: None,
                command: Some(command),
                exit_code,
                status: Some(if exit_code.map(|c| c == 0).unwrap_or(false) { "completed" } else { "failed" }.to_string()),
                suggested_command: None,
                framework: None,
                friendly_description: Some(friendly_description),
            }),
        }
    }

    pub fn file_operation(file_path: String, operation: FileOperation, friendly_description: String) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::FileOperation,
            content: friendly_description.clone(),
            timestamp: current_timestamp(),
            metadata: Some(MessageMetadata {
                language: None,
                file_path: Some(file_path),
                operation: Some(operation),
                command: None,
                exit_code: None,
                status: None,
                suggested_command: None,
                framework: None,
                friendly_description: Some(friendly_description),
            }),
        }
    }

    pub fn error(content: String) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::Error,
            content,
            timestamp: current_timestamp(),
            metadata: None,
        }
    }

    pub fn preview_suggestion(content: String, suggested_command: String, framework: String) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::PreviewSuggestion,
            content,
            timestamp: current_timestamp(),
            metadata: Some(MessageMetadata {
                language: None,
                file_path: None,
                operation: None,
                command: None,
                exit_code: None,
                status: None,
                suggested_command: Some(suggested_command),
                framework: Some(framework),
                friendly_description: None,
            }),
        }
    }

    pub fn system(content: String) -> Self {
        Self {
            id: generate_message_id(),
            msg_type: MessageType::System,
            content,
            timestamp: current_timestamp(),
            metadata: None,
        }
    }
}

fn generate_session_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let random: u32 = rand::random();
    format!("codex-{}-{:x}", timestamp, random)
}

fn generate_message_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_micros();
    let random: u16 = rand::random();
    format!("msg-{}-{:x}", timestamp, random)
}

fn current_timestamp() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}
