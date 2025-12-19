import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Send, Terminal, Settings, Zap, RefreshCw, Puzzle, LogOut, Palette, Command } from "lucide-react";
import { useLauncherStore } from "@/stores/launcher";
import { useAIStore } from "@/stores/ai";
import { useCodexStore } from "@/stores/codex";
import { cn } from "@/lib/utils";

// Map command triggers to icons
const commandIcons: Record<string, React.ReactNode> = {
  codex: <Terminal className="h-3.5 w-3.5" />,
  ai: <Sparkles className="h-3.5 w-3.5" />,
  settings: <Settings className="h-3.5 w-3.5" />,
  theme: <Palette className="h-3.5 w-3.5" />,
  reload: <RefreshCw className="h-3.5 w-3.5" />,
  plugins: <Puzzle className="h-3.5 w-3.5" />,
  quit: <LogOut className="h-3.5 w-3.5" />,
};

export function SearchInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, moveSelection, executeSelected, hideWindow, results, matchedCommand, matchingCommands } =
    useLauncherStore();
  const { isAIMode, isStreaming, sendMessage, exitAIMode, enterAIMode } = useAIStore();
  const { enterCodexMode } = useCodexStore();
  const [aiInput, setAiInput] = useState("");

  // Check if we have a matched command trigger
  const hasCommandTrigger = matchedCommand !== null;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Focus input when switching modes
  useEffect(() => {
    inputRef.current?.focus();
  }, [isAIMode]);

  const handleEnterAIMode = useCallback(async () => {
    if (query.trim()) {
      await enterAIMode(query.trim());
      setQuery("");
    }
  }, [query, enterAIMode, setQuery]);

  const handleAISend = async () => {
    if (aiInput.trim() && !isStreaming) {
      await sendMessage(aiInput.trim());
      setAiInput("");
    }
  };

  // Handle command execution based on trigger
  const executeCommand = useCallback(async () => {
    if (!matchedCommand) return;

    const trigger = matchedCommand.trigger.toLowerCase();
    
    // Handle built-in commands
    switch (trigger) {
      case "codex":
        enterCodexMode();
        setQuery("");
        return;
      case "ai":
        const aiQuery = query.replace(/^ai:\s*/i, "").trim();
        if (aiQuery) {
          await enterAIMode(aiQuery);
        } else {
          await enterAIMode("");
        }
        setQuery("");
        return;
      case "settings":
        // Dispatch event to open settings
        window.dispatchEvent(new CustomEvent("open-settings"));
        setQuery("");
        hideWindow();
        return;
      case "reload":
        // Could trigger re-indexing
        setQuery("");
        return;
      case "quit":
        // Could close the app
        setQuery("");
        hideWindow();
        return;
      default:
        // For plugin commands, we could trigger a plugin-specific mode
        // For now, just clear the query
        setQuery("");
        return;
    }
  }, [matchedCommand, query, enterCodexMode, enterAIMode, setQuery, hideWindow]);

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
        // Check for command trigger first
        if (hasCommandTrigger) {
          executeCommand();
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
      <div className="search-container relative flex items-center px-5 py-4">
        {/* Animated AI icon */}
        <motion.div
          animate={{ 
            rotate: isStreaming ? 360 : 0,
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            rotate: { duration: 2, repeat: isStreaming ? Infinity : 0, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute left-7"
        >
          <Sparkles className="h-5 w-5 text-[var(--theme-accent)]" />
        </motion.div>
        
        <input
          ref={inputRef}
          type="text"
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI anything..."
          disabled={isStreaming}
          className={cn(
            "search-input w-full bg-transparent pl-12 pr-14 py-2 text-lg font-medium",
            "placeholder:text-[var(--theme-fg-subtle)]",
            "focus:outline-none",
            "text-[var(--theme-fg)]",
            "disabled:opacity-50"
          )}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
        
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAISend}
          disabled={isStreaming || !aiInput.trim()}
          className={cn(
            "absolute right-6 p-2 rounded-lg transition-all duration-200",
            "bg-[var(--theme-accent)] text-[var(--theme-bg)]",
            "hover:shadow-lg",
            "disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-fg-subtle)]"
          )}
          style={{
            boxShadow: aiInput.trim() && !isStreaming ? `0 4px 15px -2px var(--theme-accent)50` : undefined,
          }}
        >
          <Send className="h-4 w-4" />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="search-container relative flex items-center px-5 py-4">
      {/* Animated search icon */}
      <motion.div
        animate={{ 
          scale: query ? 1.1 : 1,
          rotate: query ? 5 : 0,
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="absolute left-7"
      >
        <Search
          className={cn(
            "h-5 w-5 transition-colors duration-200",
            query ? "text-[var(--theme-accent)]" : "text-[var(--theme-fg-subtle)]"
          )}
        />
      </motion.div>
      
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search apps, files, or press Enter to ask AI..."
        className={cn(
          "search-input w-full bg-transparent pl-12 pr-4 py-2 text-lg font-medium",
          "placeholder:text-[var(--theme-fg-subtle)]",
          "focus:outline-none",
          "text-[var(--theme-fg)]"
        )}
        autoFocus
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
      
      {/* AI hint */}
      <AnimatePresence>
        {query.trim() && results.length === 0 && !hasCommandTrigger && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute right-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--theme-accent)]15 border border-[var(--theme-accent)]30"
          >
            <Sparkles className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
            <span className="text-xs font-medium text-[var(--theme-accent)]">Press Enter for AI</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Command trigger indicator */}
      <AnimatePresence>
        {hasCommandTrigger && matchedCommand && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute right-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--theme-accent)] text-[var(--theme-bg)]"
            style={{
              boxShadow: `0 4px 15px -2px var(--theme-accent)50`,
            }}
          >
            {commandIcons[matchedCommand.trigger.toLowerCase()] || <Zap className="h-3.5 w-3.5" />}
            <span className="text-xs font-medium">{matchedCommand.name}</span>
            <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--theme-bg)]30">↵</kbd>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Command suggestions */}
      <AnimatePresence>
        {!hasCommandTrigger && matchingCommands.length > 0 && query.trim() && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute right-6 flex items-center gap-2 text-xs text-[var(--theme-fg-muted)]"
          >
            <Command className="h-3 w-3" />
            <span>Try: <span className="text-[var(--theme-accent)] font-medium">{matchingCommands[0].trigger}:</span></span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
