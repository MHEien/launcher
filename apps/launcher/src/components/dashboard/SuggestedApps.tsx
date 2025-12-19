import { useEffect } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "@/stores/settings";
import { cn } from "@/lib/utils";
import type { SearchResult, ResultIcon } from "@/types";

function getIconDisplay(icon: ResultIcon): string {
  switch (icon.type) {
    case "Emoji":
      return icon.value;
    case "Text":
      return icon.value.charAt(0).toUpperCase();
    case "Path":
      return "📁";
    default:
      return "📱";
  }
}

export function SuggestedApps() {
  const { suggestedApps, loadSuggestedApps, settings, pinApp, unpinApp } = useSettingsStore();

  useEffect(() => {
    loadSuggestedApps();
  }, [loadSuggestedApps]);

  const handleAppClick = async (app: SearchResult) => {
    try {
      await invoke("execute_result", { resultId: app.id });
    } catch (error) {
      console.error("Failed to execute app:", error);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, app: SearchResult) => {
    e.preventDefault();
    const isPinned = settings?.pinned_apps.includes(app.id);
    
    if (isPinned) {
      unpinApp(app.id);
    } else {
      pinApp(app.id);
    }
  };

  if (suggestedApps.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        <p>No suggested apps yet</p>
        <p className="text-xs mt-1">Launch some apps to see suggestions</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
        Suggested Apps
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {suggestedApps.map((app, index) => {
          const isPinned = settings?.pinned_apps.includes(app.id);
          
          return (
            <motion.button
              key={app.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03, duration: 0.15 }}
              onClick={() => handleAppClick(app)}
              onContextMenu={(e) => handleContextMenu(e, app)}
              className={cn(
                "group flex flex-col items-center gap-1.5 p-3 rounded-lg",
                "hover:bg-muted/50 transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                isPinned && "ring-1 ring-primary/30"
              )}
              title={`${app.title}${isPinned ? " (pinned)" : ""}\nRight-click to ${isPinned ? "unpin" : "pin"}`}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                "bg-linear-to-br from-muted/80 to-muted/40",
                "group-hover:from-muted to-muted/60 transition-all",
                "shadow-sm"
              )}>
                {getIconDisplay(app.icon)}
              </div>
              <span className="text-xs text-center truncate w-full px-1">
                {app.title}
              </span>
              {isPinned && (
                <span className="absolute top-1 right-1 text-[10px] text-primary">📌</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

