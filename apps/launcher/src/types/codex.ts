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
  working_dir: string;
  state: SessionState;
}

/** Message type in a session */
export type MessageType =
  | "user"
  | "assistant"
  | "system"
  | "code"
  | "file_operation"
  | "command"
  | "error"
  | "approval_request"
  | "output";

/** File operation types */
export type FileOperation = "create" | "modify" | "delete" | "read";

/** Message metadata */
export interface MessageMetadata {
  language?: string;
  file_path?: string;
  operation?: FileOperation;
  command?: string;
  exit_code?: number;
  approval_id?: string;
}

/** Session message */
export interface SessionMessage {
  id: string;
  type: MessageType;
  content: string;
  timestamp: number;
  metadata?: MessageMetadata;
}

