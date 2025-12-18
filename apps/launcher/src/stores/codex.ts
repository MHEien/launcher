import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import type {
  CodexStatus,
  CodexAuthStatus,
  PackageManager,
  PackageManagerInfo,
  SessionInfo,
  SessionMessage,
  BunInstallStatus,
  DevServerInfo,
} from "@/types/codex";

interface CodexState {
  // Installation state
  installStatus: CodexStatus;
  packageManagers: PackageManagerInfo[];
  isCheckingInstall: boolean;
  isInstallingBun: boolean;

  // Auth state
  authStatus: CodexAuthStatus;
  isAuthenticating: boolean;

  // Session state
  currentSession: SessionInfo | null;
  messages: SessionMessage[];
  isSessionActive: boolean;

  // Dev server state
  devServer: DevServerInfo | null;
  previewSuggestion: { command: string; framework?: string } | null;
  isStartingDevServer: boolean;

  // UI state
  isCodexMode: boolean;
  selectedWorkingDir: string | null;

  // Actions
  checkInstalled: () => Promise<void>;
  getPackageManagers: () => Promise<void>;
  install: (packageManager: PackageManager) => Promise<void>;
  installBun: () => Promise<void>;
  login: () => Promise<void>;
  checkAuth: () => Promise<void>;
  openAuthUrl: (url: string) => Promise<void>;

  // Session actions
  startSession: (workingDir: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  stopSession: () => Promise<void>;
  pollOutput: () => Promise<void>;

  // Dev server actions
  startDevServer: (command?: string) => Promise<void>;
  stopDevServer: () => Promise<void>;
  openPreview: () => void;

  // UI actions
  enterCodexMode: (workingDir?: string) => void;
  exitCodexMode: () => void;
  setWorkingDir: (dir: string) => void;
  clearMessages: () => void;
}

export const useCodexStore = create<CodexState>((set, get) => ({
  // Initial state
  installStatus: { status: "NotInstalled" },
  packageManagers: [],
  isCheckingInstall: false,
  isInstallingBun: false,
  authStatus: { status: "NotAuthenticated" },
  isAuthenticating: false,
  currentSession: null,
  messages: [],
  isSessionActive: false,
  devServer: null,
  previewSuggestion: null,
  isStartingDevServer: false,
  isCodexMode: false,
  selectedWorkingDir: null,

  checkInstalled: async () => {
    set({ isCheckingInstall: true });
    try {
      const status = await invoke<CodexStatus>("codex_check_installed");
      set({ installStatus: status });
    } catch (error) {
      console.error("Failed to check Codex installation:", error);
      set({ installStatus: { status: "NotInstalled" } });
    } finally {
      set({ isCheckingInstall: false });
    }
  },

  getPackageManagers: async () => {
    try {
      const managers = await invoke<PackageManagerInfo[]>("codex_get_package_managers");
      set({ packageManagers: managers });
    } catch (error) {
      console.error("Failed to get package managers:", error);
    }
  },

  install: async (packageManager: PackageManager) => {
    set({ installStatus: { status: "Installing", progress: "Starting installation..." } });
    try {
      const status = await invoke<CodexStatus>("codex_install", { packageManager });
      set({ installStatus: status });
    } catch (error) {
      console.error("Failed to install Codex:", error);
      set({
        installStatus: {
          status: "InstallFailed",
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  },

  installBun: async () => {
    set({ isInstallingBun: true });
    try {
      const result = await invoke<BunInstallStatus>("codex_install_bun");
      if (result.status === "Completed") {
        // Refresh package managers after successful install
        await get().getPackageManagers();
      } else if (result.status === "Failed") {
        console.error("Bun installation failed:", result.error);
      }
    } catch (error) {
      console.error("Failed to install Bun:", error);
    } finally {
      set({ isInstallingBun: false });
    }
  },

  login: async () => {
    set({ isAuthenticating: true });
    try {
      const status = await invoke<CodexAuthStatus>("codex_login");
      set({ authStatus: status });

      // If we got an auth URL, open it in the browser
      if (status.status === "AwaitingAuth") {
        await get().openAuthUrl(status.auth_url);
      }
    } catch (error) {
      console.error("Failed to start Codex login:", error);
      set({
        authStatus: {
          status: "Failed",
          error: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      set({ isAuthenticating: false });
    }
  },

  checkAuth: async () => {
    try {
      const status = await invoke<CodexAuthStatus>("codex_check_auth");
      set({ authStatus: status });
    } catch (error) {
      console.error("Failed to check Codex auth:", error);
    }
  },

  openAuthUrl: async (url: string) => {
    try {
      await openUrl(url);
    } catch (error) {
      console.error("Failed to open auth URL:", error);
    }
  },

  startSession: async (workingDir: string) => {
    try {
      const session = await invoke<SessionInfo>("codex_start_session", { workingDir });
      set({
        currentSession: session,
        isSessionActive: true,
        messages: [],
        selectedWorkingDir: workingDir,
      });

      // Start polling for output
      get().pollOutput();
    } catch (error) {
      console.error("Failed to start Codex session:", error);
      set({
        messages: [
          ...get().messages,
          {
            id: `error-${Date.now()}`,
            type: "error",
            content: `Failed to start session: ${error}`,
            timestamp: Date.now(),
          },
        ],
      });
    }
  },

  sendMessage: async (message: string) => {
    const { currentSession, messages } = get();
    if (!currentSession) {
      console.error("No active session");
      return;
    }

    // Add user message to the list
    set({
      messages: [
        ...messages,
        {
          id: `user-${Date.now()}`,
          type: "user",
          content: message,
          timestamp: Date.now(),
        },
      ],
    });

    try {
      await invoke("codex_send_message", {
        sessionId: currentSession.id,
        message,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      set({
        messages: [
          ...get().messages,
          {
            id: `error-${Date.now()}`,
            type: "error",
            content: `Failed to send message: ${error}`,
            timestamp: Date.now(),
          },
        ],
      });
    }
  },

  stopSession: async () => {
    const { currentSession } = get();
    if (!currentSession) return;

    try {
      await invoke("codex_stop_session", { sessionId: currentSession.id });
    } catch (error) {
      console.error("Failed to stop session:", error);
    } finally {
      set({
        currentSession: null,
        isSessionActive: false,
      });
    }
  },

  pollOutput: async () => {
    const { currentSession, isSessionActive } = get();
    if (!currentSession || !isSessionActive) return;

    try {
      const newMessages = await invoke<SessionMessage[]>("codex_poll_output", {
        sessionId: currentSession.id,
      });

      if (newMessages.length > 0) {
        // Check for preview suggestions in new messages
        for (const msg of newMessages) {
          if (msg.type === "preview_suggestion" && msg.metadata) {
            set({
              previewSuggestion: {
                command: msg.metadata.suggested_command || "bun run dev",
                framework: msg.metadata.framework,
              },
            });
          }
        }
        set({ messages: [...get().messages, ...newMessages] });
      }

      // Continue polling if session is still active
      if (get().isSessionActive) {
        setTimeout(() => get().pollOutput(), 100);
      }
    } catch (error) {
      console.error("Failed to poll output:", error);
      // Session may have ended
      set({ isSessionActive: false });
    }
  },

  startDevServer: async (command?: string) => {
    const { currentSession } = get();
    if (!currentSession) {
      console.error("No active session for dev server");
      return;
    }

    set({ isStartingDevServer: true });

    try {
      const serverInfo = await invoke<DevServerInfo>("codex_start_dev_server", {
        sessionId: currentSession.id,
        command: command || undefined,
      });
      set({ 
        devServer: serverInfo,
        previewSuggestion: null, // Clear suggestion once server is started
      });
    } catch (error) {
      console.error("Failed to start dev server:", error);
      set({
        messages: [
          ...get().messages,
          {
            id: `error-${Date.now()}`,
            type: "error",
            content: `Failed to start dev server: ${error}`,
            timestamp: Date.now(),
          },
        ],
      });
    } finally {
      set({ isStartingDevServer: false });
    }
  },

  stopDevServer: async () => {
    const { currentSession } = get();
    if (!currentSession) return;

    try {
      await invoke("codex_stop_dev_server", {
        sessionId: currentSession.id,
      });
      set({ devServer: null });
    } catch (error) {
      console.error("Failed to stop dev server:", error);
    }
  },

  openPreview: () => {
    const { devServer } = get();
    if (devServer?.url) {
      openUrl(devServer.url);
    }
  },

  enterCodexMode: (workingDir?: string) => {
    set({
      isCodexMode: true,
      selectedWorkingDir: workingDir || null,
      messages: [],
    });
  },

  exitCodexMode: () => {
    const { currentSession, devServer } = get();
    if (devServer) {
      get().stopDevServer();
    }
    if (currentSession) {
      get().stopSession();
    }
    set({
      isCodexMode: false,
      messages: [],
      currentSession: null,
      isSessionActive: false,
      devServer: null,
      previewSuggestion: null,
    });
  },

  setWorkingDir: (dir: string) => {
    set({ selectedWorkingDir: dir });
  },

  clearMessages: () => {
    set({ messages: [] });
  },
}));

