import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { TerminalSquare, RefreshCw, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import "@xterm/xterm/css/xterm.css";

interface TerminalWidgetProps {
  config?: Record<string, unknown> | null;
}

// Generate a unique terminal ID
function generateTerminalId(): string {
  return `terminal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function TerminalWidget({ config }: TerminalWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [terminalId] = useState(() => generateTerminalId());
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unlistenersRef = useRef<UnlistenFn[]>([]);

  // Get initial working directory from config or use home
  const initialCwd = config?.cwd as string | undefined;

  // Create terminal UI (without spawning PTY)
  const createTerminalUI = useCallback(() => {
    if (!containerRef.current || terminalRef.current) return;

    // Create terminal instance
    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontSize: 12,
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
      theme: {
        background: "#18181b",
        foreground: "#e4e4e7",
        cursor: "#e4e4e7",
        cursorAccent: "#18181b",
        selectionBackground: "#3f3f46",
        black: "#18181b",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#e4e4e7",
        brightBlack: "#52525b",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#facc15",
        brightBlue: "#60a5fa",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#fafafa",
      },
      allowProposedApi: true,
      scrollback: 1000,
      convertEol: true,
    });

    // Add fit addon
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    // Add web links addon
    const webLinksAddon = new WebLinksAddon();
    terminal.loadAddon(webLinksAddon);

    // Open terminal in container
    terminal.open(containerRef.current);
    terminalRef.current = terminal;

    // Initial fit after a small delay to ensure container is sized
    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        // Ignore fit errors during initial setup
      }
    }, 100);

    return terminal;
  }, []);

  // Connect to PTY (spawn shell)
  const connectTerminal = useCallback(async () => {
    if (!terminalRef.current || isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);
    setHasStarted(true);

    const terminal = terminalRef.current;

    try {
      // Fit terminal to get correct dimensions
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }

      const cols = terminal.cols || 80;
      const rows = terminal.rows || 24;

      // Set up event listeners for terminal output
      const outputUnlisten = await listen<string>(`terminal-output-${terminalId}`, (event) => {
        terminal.write(event.payload);
      });
      unlistenersRef.current.push(outputUnlisten);

      const errorUnlisten = await listen<string>(`terminal-error-${terminalId}`, (event) => {
        console.error("Terminal error:", event.payload);
        setError(event.payload);
      });
      unlistenersRef.current.push(errorUnlisten);

      const closeUnlisten = await listen(`terminal-closed-${terminalId}`, () => {
        setIsConnected(false);
        terminal.write("\r\n\x1b[33m[Session ended - click Restart to reconnect]\x1b[0m\r\n");
      });
      unlistenersRef.current.push(closeUnlisten);

      // Spawn the terminal
      await invoke("terminal_spawn", {
        id: terminalId,
        cols,
        rows,
        cwd: initialCwd || null,
      });

      setIsConnected(true);
      setIsConnecting(false);

      // Handle user input - onData is called when user types
      terminal.onData((data) => {
        invoke("terminal_write", { id: terminalId, data }).catch(console.error);
      });

      // Focus terminal for input after a small delay
      setTimeout(() => {
        terminal.focus();
      }, 50);

    } catch (err) {
      console.error("Failed to spawn terminal:", err);
      setError(String(err));
      setIsConnecting(false);
      terminal.write(`\x1b[31mFailed to connect: ${err}\x1b[0m\r\n`);
    }
  }, [terminalId, initialCwd, isConnecting]);

  // Handle resize
  const handleResize = useCallback(() => {
    if (!terminalRef.current || !fitAddonRef.current) return;

    try {
      fitAddonRef.current.fit();
      if (isConnected) {
        const { cols, rows } = terminalRef.current;
        invoke("terminal_resize", { id: terminalId, cols, rows }).catch(console.error);
      }
    } catch (e) {
      // Ignore resize errors
    }
  }, [terminalId, isConnected]);

  // Restart terminal
  const handleRestart = useCallback(async () => {
    // Clean up existing listeners
    unlistenersRef.current.forEach((unlisten) => unlisten());
    unlistenersRef.current = [];

    if (terminalRef.current) {
      terminalRef.current.clear();
    }

    try {
      // Close existing session if any
      await invoke("terminal_close", { id: terminalId }).catch(() => {});
    } catch {
      // Ignore close errors
    }

    setIsConnected(false);
    setError(null);

    // Reconnect
    await connectTerminal();
  }, [terminalId, connectTerminal]);

  // Focus terminal on click
  const handleContainerClick = useCallback(() => {
    if (terminalRef.current && isConnected) {
      terminalRef.current.focus();
    }
  }, [isConnected]);

  // Create terminal UI on mount
  useEffect(() => {
    createTerminalUI();

    return () => {
      // Cleanup listeners
      unlistenersRef.current.forEach((unlisten) => unlisten());
      unlistenersRef.current = [];

      // Close terminal session
      invoke("terminal_close", { id: terminalId }).catch(() => {});

      // Dispose terminal
      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
      }
    };
  }, [createTerminalUI, terminalId]);

  // Handle resize events
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [handleResize]);

  return (
    <div className="h-full flex flex-col bg-zinc-900 rounded overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-zinc-800/80 border-b border-zinc-700/50 shrink-0">
        <div className="flex items-center gap-1.5">
          <TerminalSquare className="h-3 w-3 text-emerald-400" />
          <span className="text-[10px] font-medium text-zinc-400">Terminal</span>
          {isConnected && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
          {isConnecting && (
            <span className="text-[10px] text-zinc-500">connecting...</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasStarted && (
            <button
              onClick={handleRestart}
              className="p-0.5 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Restart terminal"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal container */}
      <div 
        ref={containerRef} 
        onClick={handleContainerClick}
        className={cn(
          "flex-1 overflow-hidden cursor-text",
          !hasStarted && "hidden"
        )}
        style={{ minHeight: 0, padding: "4px" }}
      />

      {/* Connect overlay - shown before first connection */}
      {!hasStarted && (
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={connectTerminal}
            disabled={isConnecting}
            className={cn(
              "flex flex-col items-center gap-2 px-4 py-3 rounded-lg",
              "bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50",
              "transition-colors group",
              isConnecting && "opacity-50 cursor-wait"
            )}
          >
            <div className="p-2 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
              <Play className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="text-xs text-zinc-400 group-hover:text-zinc-300">
              {isConnecting ? "Connecting..." : "Start Terminal"}
            </span>
          </button>
        </div>
      )}

      {/* Error overlay */}
      {error && hasStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 z-10">
          <div className="text-center px-4">
            <TerminalSquare className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-xs text-red-400 mb-1">Connection failed</p>
            <p className="text-[10px] text-zinc-500 mb-3 max-w-[200px]">{error}</p>
            <button
              onClick={handleRestart}
              className="text-xs px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
