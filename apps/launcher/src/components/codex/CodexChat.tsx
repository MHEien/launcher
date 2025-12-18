import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { useCodexStore } from "@/stores/codex";
import { cn } from "@/lib/utils";
import type { SessionMessage } from "@/types/codex";
import { MarkdownRenderer } from "../ai/MarkdownRenderer";
import { CodeBlock } from "../ai/CodeBlock";

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

    // If no session, start one with the message
    if (!currentSession && selectedWorkingDir) {
      await startSession(selectedWorkingDir);
      // Wait a bit for session to start, then send
      setTimeout(() => sendMessage(message), 500);
    } else {
      await sendMessage(message);
    }
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

  const handleDirSelect = () => {
    // TODO: Implement directory picker using Tauri dialog
    // For now, use a simple input
    const dir = prompt("Enter working directory path:");
    if (dir) {
      setWorkingDir(dir);
      setShowDirPicker(false);
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
                  <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    Type a message to start coding with Codex
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
                placeholder="Ask Codex to help you code..."
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
    case "output":
      return (
        <div className="max-w-[95%]">
          <div className="text-sm text-foreground">
            <MarkdownRenderer content={content} />
          </div>
        </div>
      );

    case "code":
      return (
        <div className="max-w-[95%]">
          <CodeBlock
            data={{
              language: metadata?.language || "text",
              code: content,
            }}
          />
        </div>
      );

    case "command":
      return (
        <div className="max-w-[95%] rounded-lg bg-zinc-900 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 text-xs">
            <Play className="h-3 w-3 text-emerald-400" />
            <span className="font-mono text-muted-foreground">
              {metadata?.command}
            </span>
            {metadata?.exit_code !== undefined && (
              <span
                className={cn(
                  "ml-auto",
                  metadata.exit_code === 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                {metadata.exit_code === 0 ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
              </span>
            )}
          </div>
          {content && (
            <pre className="p-3 text-xs font-mono text-zinc-300 overflow-x-auto">
              {content}
            </pre>
          )}
        </div>
      );

    case "file_operation":
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20 text-sm">
          <FileCode className="h-4 w-4 text-amber-400" />
          <span className="text-muted-foreground">
            {metadata?.operation === "create" && "Created"}
            {metadata?.operation === "modify" && "Modified"}
            {metadata?.operation === "delete" && "Deleted"}
            {metadata?.operation === "read" && "Read"}
          </span>
          <span className="font-mono text-xs">{metadata?.file_path}</span>
        </div>
      );

    case "error":
      return (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-sm">
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

    case "approval_request":
      return (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-400 font-medium">
                Approval Required
              </p>
              <p className="text-sm text-muted-foreground mt-1">{content}</p>
              <div className="flex gap-2 mt-2">
                <button className="px-3 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                  Approve
                </button>
                <button className="px-3 py-1 text-xs rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20">
                  Deny
                </button>
              </div>
            </div>
          </div>
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

