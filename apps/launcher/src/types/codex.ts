// Codex CLI Integration Types

/** Status of Codex CLI installation */
export type CodexStatus =
  | { status: "Installed"; version: string }
  | { status: "NotInstalled" }
  | { status: "Checking" }
  | { status: "Installing"; progress: string }
  | { status: "InstallFailed"; error: string };

/** Authentication status for Codex */
export type CodexAuthStatus =
  | { status: "NotAuthenticated" }
  | { status: "AwaitingAuth"; auth_url: string }
  | { status: "Authenticated" }
  | { status: "Failed"; error: string };

/** Package manager options */
export type PackageManager = "npm" | "bun";

/** Bun installation status */
export type BunInstallStatus =
  | { status: "Installing"; message: string }
  | { status: "Completed"; version: string }
  | { status: "Failed"; error: string };

/** Package manager information */
export interface PackageManagerInfo {
  id: PackageManager;
  name: string;
  available: boolean;
  version: string | null;
  description: string;
}

/** Session state */
export type SessionState = "Created" | "Running" | "Idle" | "Ended";

/** Session info from backend */
export interface SessionInfo {
  id: string;
  thread_id?: string; // Codex thread ID for resume capability
  working_dir: string;
  state: SessionState;
}

/** Message type in a session */
export type MessageType =
  | "user"
  | "assistant"
  | "system"
  | "thinking"          // Codex is reasoning (shown as progress)
  | "command"           // Command being executed
  | "command_output"    // Output from command
  | "file_operation"
  | "error"
  | "preview_suggestion"
  | "progress";         // General progress indicator

/** File operation types */
export type FileOperation = "create" | "modify" | "delete" | "read";

/** Message metadata */
export interface MessageMetadata {
  language?: string;
  file_path?: string;
  operation?: FileOperation;
  command?: string;
  exit_code?: number;
  status?: string;
  suggested_command?: string;
  framework?: string;
  /** User-friendly description of what's happening */
  friendly_description?: string;
}

/** Session message */
export interface SessionMessage {
  id: string;
  type: MessageType;
  content: string;
  timestamp: number;
  metadata?: MessageMetadata;
}

/** Dev server information */
export interface DevServerInfo {
  url: string;
  command: string;
  framework: string;
  is_running: boolean;
  port: number;
  working_dir: string;
}

