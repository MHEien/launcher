import { useRef, useEffect, useState } from "react";
import { Search, Sparkles, Send, Terminal } from "lucide-react";
import { useLauncherStore } from "@/stores/launcher";
import { useAIStore } from "@/stores/ai";
import { useCodexStore } from "@/stores/codex";
import { cn } from "@/lib/utils";

export function SearchInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, moveSelection, executeSelected, hideWindow, results } =
    useLauncherStore();
  const { isAIMode, isStreaming, sendMessage, exitAIMode } = useAIStore();
  const { enterCodexMode } = useCodexStore();
  const [aiInput, setAiInput] = useState("");

  // Check for codex: prefix
  const isCodexTrigger = query.toLowerCase().startsWith("codex:");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Focus input when switching modes
  useEffect(() => {
    inputRef.current?.focus();
  }, [isAIMode]);

  const handleEnterAIMode = async () => {
    if (query.trim()) {
      const { enterAIMode } = useAIStore.getState();
      await enterAIMode(query.trim());
      setQuery("");
    }
  };

  const handleAISend = async () => {
    if (aiInput.trim() && !isStreaming) {
      await sendMessage(aiInput.trim());
      setAiInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isAIMode) {
      // AI mode key handling
      switch (e.key) {
        case "Enter":
          if (!e.shiftKey) {
            e.preventDefault();
            handleAISend();
          }
          break;
        case "Escape":
          e.preventDefault();
          exitAIMode();
          break;
      }
      return;
    }

    // Normal search mode key handling
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        moveSelection("up");
        break;
      case "ArrowDown":
        e.preventDefault();
        moveSelection("down");
        break;
      case "Enter":
        e.preventDefault();
        // Check for codex: prefix first
        if (isCodexTrigger) {
          enterCodexMode();
          setQuery("");
        } else if (results.length > 0) {
          // If there are results and one is selected, execute it
          executeSelected();
        } else if (query.trim()) {
          // Otherwise, if there's a query, enter AI mode
          handleEnterAIMode();
        }
        break;
      case "Escape":
        e.preventDefault();
        hideWindow();
        break;
      case "Tab":
        // Tab to enter AI mode if there's a query
        if (query.trim() && e.shiftKey) {
          e.preventDefault();
          handleEnterAIMode();
        }
        break;
    }
  };

  if (isAIMode) {
    return (
      <div className="relative flex items-center px-4 py-3">
        <Sparkles
          className={cn(
            "absolute left-6 h-5 w-5 text-primary transition-colors"
          )}
        />
        <input
          ref={inputRef}
          type="text"
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI anything..."
          disabled={isStreaming}
          className={cn(
            "w-full bg-transparent pl-10 pr-12 py-2 text-lg",
            "placeholder:text-muted-foreground/60",
            "focus:outline-none",
            "text-foreground",
            "disabled:opacity-50"
          )}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
        <button
          onClick={handleAISend}
          disabled={isStreaming || !aiInput.trim()}
          className={cn(
            "absolute right-6 p-1.5 rounded-md transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            "disabled:opacity-30 disabled:cursor-not-allowed"
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center px-4 py-3">
      <Search
        className={cn(
          "absolute left-6 h-5 w-5 text-muted-foreground transition-colors",
          query && "text-foreground"
        )}
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search apps, files, or press Enter to ask AI..."
        className={cn(
          "w-full bg-transparent pl-10 pr-4 py-2 text-lg",
          "placeholder:text-muted-foreground/60",
          "focus:outline-none",
          "text-foreground"
        )}
        autoFocus
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
      {query.trim() && results.length === 0 && !isCodexTrigger && (
        <div className="absolute right-6 flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span>Press Enter for AI</span>
        </div>
      )}
      {isCodexTrigger && (
        <div className="absolute right-6 flex items-center gap-1 text-xs text-emerald-400">
          <Terminal className="h-3 w-3" />
          <span>Press Enter for Codex</span>
        </div>
      )}
    </div>
  );
}
