import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Settings as SettingsIcon } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useLauncherStore } from "@/stores/launcher";
import { useAuthStore } from "@/stores/auth";
import { useAIStore } from "@/stores/ai";
import { SearchInput } from "./SearchInput";
import { CalculatorResult } from "./CalculatorResult";
import { ResultsList } from "./ResultsList";
import { Settings } from "./Settings";
import { AIChat } from "./ai";
import { cn } from "@/lib/utils";

interface InstallStatus {
  pluginId: string;
  status: "installing" | "success" | "error";
  message: string;
}

export function Launcher() {
  const { loadTheme, hideWindow, results, indexingStatus, setupIndexingListener } =
    useLauncherStore();
  const { initialize: initAuth, setupAuthListener } = useAuthStore();
  const { isAIMode } = useAIStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [installStatus, setInstallStatus] = useState<InstallStatus | null>(null);

  useEffect(() => {
    loadTheme();
    setupIndexingListener();
    initAuth();
    
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
        await invoke("install_plugin", { pluginId });
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
      if (!target.closest(".launcher-container") && !settingsOpen) {
        hideWindow();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (unlistenAuth) unlistenAuth();
      if (unlistenInstall) unlistenInstall();
    };
  }, [loadTheme, hideWindow, setupIndexingListener, settingsOpen, initAuth, setupAuthListener]);

  const hasResults = results.length > 0;
  const hasCalcResult = results.some((r) => r.category === "Calculator");
  const hasOtherResults = results.some((r) => r.category !== "Calculator");
  const isIndexing = indexingStatus?.is_indexing;

  return (
    <div className="h-screen w-screen flex items-center justify-center overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "launcher-container w-full max-w-[680px]",
          "rounded-xl",
          "overflow-hidden"
        )}
        style={{
          backgroundColor: "var(--launcher-bg)",
        } as React.CSSProperties}
      >
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

        {/* AI Chat Mode */}
        {isAIMode && (
          <div className="border-t border-border/30">
            <AIChat />
          </div>
        )}

        {/* Normal Search Results */}
        {!isAIMode && hasResults && (
          <div className="border-t border-border/30">
            {hasCalcResult && <CalculatorResult />}
            {hasOtherResults && <ResultsList />}
          </div>
        )}

        <div className="flex items-center justify-end px-3 py-2 border-t border-border/30">
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            title="Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
