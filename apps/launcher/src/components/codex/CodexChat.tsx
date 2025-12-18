import { useEffect, useRef, useState } from "react";
import { open as tauriOpen } from "@tauri-apps/plugin-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Terminal,
  Loader2,
  AlertCircle,
  FolderOpen,
  Send,
  Square,
  FileCode,
  Play,
  CheckCircle,
  XCircle,
  ExternalLink,
  X,
  Rocket,
  Sparkles,
  Cog,
} from "lucide-react";
import { useCodexStore } from "@/stores/codex";
import { cn } from "@/lib/utils";
import type { SessionMessage } from "@/types/codex";
import { MarkdownRenderer } from "../ai/MarkdownRenderer";

export function CodexChat() {
  const {
    isCodexMode,
    currentSession,
    messages,
    isSessionActive,
    selectedWorkingDir,
    authStatus,
    installStatus,
    exitCodexMode,
    startSession,
    sendMessage,
    stopSession,
    setWorkingDir,
    devServer,
    previewSuggestion,
    isStartingDevServer,
    startDevServer,
    stopDevServer,
    openPreview,
  } = useCodexStore();

  const [inputValue, setInputValue] = useState("");
  const [showDirPicker, setShowDirPicker] = useState(!selectedWorkingDir);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when entering codex mode
  useEffect(() => {
    if (isCodexMode && !showDirPicker && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCodexMode, showDirPicker]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const message = inputValue.trim();
    setInputValue("");

    // If no session, start one first
    if (!currentSession && selectedWorkingDir) {
      console.log("[CodexChat] Starting new session...");
      await startSession(selectedWorkingDir);
      // Small delay to ensure state is updated, then send
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Send the message
    console.log("[CodexChat] Sending message:", message);
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      exitCodexMode();
    }
  };

  const handleDirSelect = async () => {
    try {
      const result = await tauriOpen({
        directory: true,
        multiple: false,
      });
      const dir = Array.isArray(result) ? result[0] : result;
      if (dir && typeof dir === "string") {
        setWorkingDir(dir);
        setShowDirPicker(false);
      }
    } catch (err) {
      // Silently ignore to keep UI snappy
    }
  };

  const isReady =
    installStatus.status === "Installed" && authStatus.status === "Authenticated";

  if (!isCodexMode) return null;

  return (
    <div className="flex flex-col h-full max-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <button
          onClick={exitCodexMode}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md",
            "text-sm text-muted-foreground hover:text-foreground",
            "hover:bg-muted/50 transition-colors"
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-medium">Codex</span>
          {isSessionActive && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          )}
        </div>

        {isSessionActive && (
          <button
            onClick={stopSession}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md",
              "text-sm text-red-400 hover:text-red-300",
              "hover:bg-red-500/10 transition-colors"
            )}
          >
            <Square className="h-3.5 w-3.5" />
            <span>Stop</span>
          </button>
        )}
      </div>

      {/* Not ready state */}
      {!isReady && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <AlertCircle className="h-8 w-8 mx-auto text-amber-400" />
            <p className="text-sm text-muted-foreground">
              {installStatus.status !== "Installed"
                ? "Codex CLI is not installed. Please install it from Settings."
                : "Please sign in with OpenAI in Settings to use Codex."}
            </p>
            <button
              onClick={exitCodexMode}
              className="text-sm text-primary hover:underline"
            >
              Go to Settings
            </button>
          </div>
        </div>
      )}

      {/* Directory picker */}
      {isReady && showDirPicker && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-sm">
            <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-medium">Select Working Directory</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose the project folder where Codex will work.
              </p>
            </div>
            <button
              onClick={handleDirSelect}
              className={cn(
                "w-full px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2",
                "bg-primary/10 text-primary hover:bg-primary/20"
              )}
            >
              <FolderOpen className="h-4 w-4" />
              Choose Folder
            </button>
          </div>
        </div>
      )}

      {/* Chat area */}
      {isReady && !showDirPicker && (
        <>
          {/* Working directory indicator */}
          {selectedWorkingDir && (
            <div className="px-3 py-1.5 bg-muted/20 border-b border-border/20">
              <button
                onClick={() => setShowDirPicker(true)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <FolderOpen className="h-3 w-3" />
                <span className="font-mono truncate">{selectedWorkingDir}</span>
              </button>
            </div>
          )}

          {/* Preview Bar - shown when dev server is running or preview suggestion available */}
          <AnimatePresence>
            {devServer?.is_running && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-3 py-2 bg-linear-to-r from-emerald-500/10 to-cyan-500/10 border-b border-emerald-500/20"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-medium text-emerald-400">Live</span>
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {devServer.framework}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={openPreview}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
                        "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30",
                        "transition-colors"
                      )}
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span className="hidden sm:inline">{devServer.url}</span>
                      <span className="sm:hidden">Open</span>
                    </button>
                    <button
                      onClick={stopDevServer}
                      className={cn(
                        "p-1.5 rounded-md text-muted-foreground hover:text-red-400",
                        "hover:bg-red-500/10 transition-colors"
                      )}
                      title="Stop dev server"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Preview Suggestion - shown when project is ready but server not started */}
            {!devServer?.is_running && previewSuggestion && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-3 py-2 bg-linear-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-amber-400">
                    <Rocket className="h-3.5 w-3.5" />
                    <span>
                      {previewSuggestion.framework
                        ? `${previewSuggestion.framework} project ready!`
                        : "Project ready to preview!"}
                    </span>
                  </div>
                  <button
                    onClick={() => startDevServer(previewSuggestion.command)}
                    disabled={isStartingDevServer}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
                      "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30",
                      "transition-colors",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isStartingDevServer ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Starting...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3" />
                        <span>Start Preview</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-2 space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {messages.length === 0 && !isSessionActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-muted-foreground"
                >
                  <Sparkles className="h-8 w-8 mx-auto mb-3 text-purple-400/60" />
                  <p className="text-sm font-medium mb-1">
                    What would you like to build?
                  </p>
                  <p className="text-xs opacity-70">
                    Describe your idea and Codex will create it for you
                  </p>
                </motion.div>
              )}

              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  <CodexMessage message={message} />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Session starting indicator */}
            {isSessionActive && messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-muted-foreground text-sm"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Starting session...</span>
              </motion.div>
            )}
          </div>

          {/* Input area */}
          <div className="px-3 py-2 border-t border-border/30">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you want to build..."
                className={cn(
                  "flex-1 px-3 py-2 text-sm rounded-md",
                  "bg-muted/30 border border-border/30",
                  "placeholder:text-muted-foreground/50",
                  "focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                )}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Render a single message */
function CodexMessage({ message }: { message: SessionMessage }) {
  const { type, content, metadata } = message;

  switch (type) {
    case "user":
      return (
        <div className="flex justify-end">
          <div className="max-w-[85%] px-3 py-2 rounded-lg bg-primary/10 text-sm">
            {content}
          </div>
        </div>
      );

    case "assistant":
      return (
        <div className="max-w-[95%]">
          <div className="text-sm text-foreground">
            <MarkdownRenderer content={content} />
          </div>
        </div>
      );

    case "thinking":
    case "progress":
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <Sparkles className="h-3 w-3 text-purple-400 animate-pulse" />
          <span className="italic">{content}</span>
        </div>
      );

    case "command":
      // Command starting - show friendly description
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 text-sm">
          <div className="flex items-center gap-2 flex-1">
            {metadata?.status === "in_progress" ? (
              <Loader2 className="h-4 w-4 text-cyan-400 animate-spin shrink-0" />
            ) : (
              <Cog className="h-4 w-4 text-cyan-400 shrink-0" />
            )}
            <span className="text-muted-foreground">
              {metadata?.friendly_description || content}
            </span>
          </div>
        </div>
      );

    case "command_output":
      // Command completed - show result
      return (
        <div className="max-w-[95%] rounded-lg bg-zinc-900/80 overflow-hidden border border-zinc-700/50">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 text-xs border-b border-zinc-700/30">
            {metadata?.status === "completed" || metadata?.exit_code === 0 ? (
              <CheckCircle className="h-3 w-3 text-emerald-400" />
            ) : (
              <XCircle className="h-3 w-3 text-amber-400" />
            )}
            <span className="text-muted-foreground">
              {metadata?.friendly_description || "Command completed"}
            </span>
          </div>
          {content && content.trim() && (
            <pre className="p-2.5 text-xs font-mono text-zinc-400 overflow-x-auto max-h-32 overflow-y-auto">
              {content.trim()}
            </pre>
          )}
        </div>
      );

    case "file_operation":
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm">
          <FileCode className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="text-amber-400/90">
            {metadata?.friendly_description || content}
          </span>
        </div>
      );

    case "error":
      return (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm">
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <span className="text-red-400">{content}</span>
        </div>
      );

    case "system":
      return (
        <div className="text-center text-xs text-muted-foreground py-1">
          {content}
        </div>
      );

    case "preview_suggestion":
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-linear-to-r from-emerald-500/10 to-cyan-500/10 text-sm border border-emerald-500/20">
          <Rocket className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-emerald-400">{content}</span>
          {metadata?.framework && (
            <span className="text-xs text-muted-foreground">
              ({metadata.framework})
            </span>
          )}
        </div>
      );

    default:
      return (
        <div className="text-sm text-muted-foreground">
          {content}
        </div>
      );
  }
}

