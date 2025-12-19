import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Settings as SettingsIcon, GripHorizontal, Pin, PinOff } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useLauncherStore } from "@/stores/launcher";
import { useAuthStore } from "@/stores/auth";
import { useAIStore } from "@/stores/ai";
import { useCodexStore } from "@/stores/codex";
import { useSettingsStore } from "@/stores/settings";
import { useTheme } from "./theme";
import { ParticleBackground, GlowOrbs } from "./effects";
import { SearchInput } from "./SearchInput";
import { CalculatorResult } from "./CalculatorResult";
import { ResultsList } from "./ResultsList";
import { Settings } from "./Settings";
import { AIChat } from "./ai";
import { CodexChat } from "./codex";
import { Dashboard } from "./dashboard";
import { cn } from "@/lib/utils";

interface InstallStatus {
  pluginId: string;
  status: "installing" | "success" | "error";
  message: string;
}

export function Launcher() {
  const { loadTheme, hideWindow, results, indexingStatus, setupIndexingListener, query } =
    useLauncherStore();
  const { initialize: initAuth, setupAuthListener } = useAuthStore();
  const { isAIMode } = useAIStore();
  const { isCodexMode } = useCodexStore();
  const { loadSettings, settings, setWindowPosition, setWindowSize, toggleCloseOnBlur } = useSettingsStore();
  const { currentTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [installStatus, setInstallStatus] = useState<InstallStatus | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Throttled window position/size save
  const saveWindowState = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const window = getCurrentWindow();
        const position = await window.outerPosition();
        const size = await window.outerSize();
        
        await setWindowPosition(position.x, position.y);
        await setWindowSize(size.width, size.height);
      } catch (error) {
        console.error("Failed to save window state:", error);
      }
    }, 500); // Throttle to 500ms
  }, [setWindowPosition, setWindowSize]);

  // Handle window drag
  const handleDragStart = useCallback(async () => {
    try {
      const window = getCurrentWindow();
      await window.startDragging();
    } catch (error) {
      console.error("Failed to start dragging:", error);
    }
  }, []);

  // Derived state: is launcher pinned? (close_on_blur = false means pinned)
  const isPinned = settings?.close_on_blur === false;

  // Handle pin toggle (stay on top)
  const handlePinToggle = useCallback(async () => {
    const willBePinned = !isPinned;
    
    try {
      const appWindow = getCurrentWindow();
      // Set always on top first
      await appWindow.setAlwaysOnTop(willBePinned);
      // Then update settings (close_on_blur = false means pinned)
      await toggleCloseOnBlur(!willBePinned);
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  }, [isPinned, toggleCloseOnBlur]);

  // Restore always-on-top state when settings load
  useEffect(() => {
    if (settings?.close_on_blur === false) {
      const window = getCurrentWindow();
      window.setAlwaysOnTop(true).catch(console.error);
    }
  }, [settings?.close_on_blur]);

  useEffect(() => {
    loadTheme();
    setupIndexingListener();
    initAuth();
    loadSettings();
    
    // Listen for window move/resize events
    let unlistenMove: (() => void) | undefined;
    let unlistenResize: (() => void) | undefined;
    
    const appWindow = getCurrentWindow();
    appWindow.onMoved(() => saveWindowState()).then((fn) => {
      unlistenMove = fn;
    });
    appWindow.onResized(() => saveWindowState()).then((fn) => {
      unlistenResize = fn;
    });
    
    // Set up auth callback listener for deep links
    let unlistenAuth: (() => void) | undefined;
    setupAuthListener().then((unlisten) => {
      unlistenAuth = unlisten;
    });
    
    // Set up plugin installation listener for deep links
    let unlistenInstall: (() => void) | undefined;
    listen<string>("install-plugin", async (event) => {
      const pluginId = event.payload;
      console.log("Received install-plugin event for:", pluginId);
      setInstallStatus({ pluginId, status: "installing", message: `Installing ${pluginId}...` });
      
      try {
        await invoke("install_plugin", { id: pluginId });
        setInstallStatus({ pluginId, status: "success", message: `${pluginId} installed successfully!` });
        // Clear status after 3 seconds
        setTimeout(() => setInstallStatus(null), 3000);
      } catch (error) {
        console.error("Failed to install plugin:", error);
        setInstallStatus({ pluginId, status: "error", message: `Failed to install: ${error}` });
        setTimeout(() => setInstallStatus(null), 5000);
      }
    }).then((fn) => {
      unlistenInstall = fn;
    });

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Get current settings from store (need fresh value, not stale closure)
      const currentSettings = useSettingsStore.getState().settings;
      const closeOnBlur = currentSettings?.close_on_blur !== false;
      if (!target.closest(".launcher-container") && !settingsOpen && closeOnBlur) {
        hideWindow();
      }
    };

    // Listen for open-settings event from widgets
    const handleOpenSettings = () => setSettingsOpen(true);
    window.addEventListener("open-settings", handleOpenSettings);

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("open-settings", handleOpenSettings);
      if (unlistenAuth) unlistenAuth();
      if (unlistenInstall) unlistenInstall();
      if (unlistenMove) unlistenMove();
      if (unlistenResize) unlistenResize();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [loadTheme, hideWindow, setupIndexingListener, settingsOpen, initAuth, setupAuthListener, loadSettings, saveWindowState]);

  const hasResults = results.length > 0;
  const hasCalcResult = results.some((r) => r.category === "Calculator");
  const hasOtherResults = results.some((r) => r.category !== "Calculator");
  const isIndexing = indexingStatus?.is_indexing;
  const showDashboard = !query.trim() && !isAIMode && !isCodexMode && settings?.dashboard_enabled;

  // Build launcher classes based on theme effects
  const launcherClasses = useMemo(() => {
    const classes: string[] = [
      "launcher-container",
      "w-full",
      "h-full",
      "flex",
      "flex-col",
      "rounded-xl",
      "overflow-hidden",
    ];
    
    // Add effect classes from current theme
    if (currentTheme.effects.glow !== "none") {
      classes.push("has-glow");
    }
    if (currentTheme.effects.noise) {
      classes.push("noise-overlay");
    }
    if (currentTheme.effects.borderGlow) {
      classes.push("border-glow");
    }
    if (currentTheme.effects.shimmer) {
      classes.push("shimmer");
    }
    if (currentTheme.effects.particles) {
      classes.push("particles");
    }
    if (currentTheme.gradient?.animated) {
      classes.push("mesh-gradient");
    }
    
    return classes.join(" ");
  }, [currentTheme]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.175, 0.885, 0.32, 1.275] }}
        className={launcherClasses}
      >
        {/* Background effects */}
        <GlowOrbs />
        <ParticleBackground />
        
        <SearchInput />

        {isIndexing && (
          <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground border-t border-border/30">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{indexingStatus?.message || "Indexing files..."}</span>
          </div>
        )}

        {installStatus && (
          <div className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm border-t border-border/30",
            installStatus.status === "installing" && "text-blue-400 bg-blue-500/10",
            installStatus.status === "success" && "text-green-400 bg-green-500/10",
            installStatus.status === "error" && "text-red-400 bg-red-500/10"
          )}>
            {installStatus.status === "installing" && <Loader2 className="h-4 w-4 animate-spin" />}
            {installStatus.status === "success" && <span>✓</span>}
            {installStatus.status === "error" && <span>✗</span>}
            <span>{installStatus.message}</span>
          </div>
        )}

        {/* Dashboard - shown when no query */}
        <AnimatePresence mode="wait">
          {showDashboard && (
            <div className="border-t border-border/30 flex-1 min-h-0 flex flex-col">
              <Dashboard />
            </div>
          )}
        </AnimatePresence>

        {/* AI Chat Mode */}
        {isAIMode && (
          <div className="border-t border-border/30">
            <AIChat />
          </div>
        )}

        {/* Codex Mode */}
        {isCodexMode && !isAIMode && (
          <div className="border-t border-border/30">
            <CodexChat />
          </div>
        )}

        {/* Normal Search Results */}
        {!isAIMode && !isCodexMode && hasResults && (
          <div className="border-t border-border/30">
            {hasCalcResult && <CalculatorResult />}
            {hasOtherResults && <ResultsList />}
          </div>
        )}

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--theme-border-subtle)]">
          {/* Drag handle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onMouseDown={handleDragStart}
            className="p-2 rounded-lg hover:bg-[var(--theme-hover)] transition-all duration-200 text-[var(--theme-fg-subtle)] hover:text-[var(--theme-fg)] cursor-grab active:cursor-grabbing"
            title="Drag to move"
          >
            <GripHorizontal className="h-4 w-4" />
          </motion.button>
          
          <div className="flex items-center gap-2">
            {/* Pin toggle with tooltip */}
            <div className="relative group">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePinToggle}
                className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  isPinned 
                    ? "bg-[var(--theme-accent)]20 text-[var(--theme-accent)]" 
                    : "text-[var(--theme-fg-subtle)] hover:bg-[var(--theme-hover)] hover:text-[var(--theme-fg)]"
                )}
                style={isPinned ? {
                  boxShadow: `0 2px 10px var(--theme-accent)30`,
                } : undefined}
                title={isPinned ? "Unpin window" : "Pin window"}
              >
                {isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
              </motion.button>
              {/* Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 backdrop-blur-xl">
                <p className="text-xs font-semibold text-[var(--theme-fg)]">
                  {isPinned ? "Window pinned" : "Pin window"}
                </p>
                <p className="text-[10px] text-[var(--theme-fg-muted)] mt-0.5">
                  {isPinned 
                    ? "Click to allow closing when clicking outside" 
                    : "Keep window open when clicking outside"}
                </p>
                <div className="absolute top-full right-4 border-4 border-transparent border-t-[var(--theme-border)]" />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-[var(--theme-hover)] transition-all duration-200 text-[var(--theme-fg-subtle)] hover:text-[var(--theme-fg)]"
              title="Settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
