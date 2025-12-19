import { useEffect } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { Pin, Sparkles } from "lucide-react";
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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.8 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
};

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
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--theme-bg-tertiary)] mb-3"
        >
          <Sparkles className="h-8 w-8 text-[var(--theme-accent)]" />
        </motion.div>
        <p className="text-[var(--theme-fg-muted)] font-medium">No suggested apps yet</p>
        <p className="text-xs text-[var(--theme-fg-subtle)] mt-1">Launch some apps to see suggestions</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-xs font-semibold text-[var(--theme-fg-muted)] uppercase tracking-wider">
          Quick Access
        </h3>
        <div className="flex-1 h-px bg-gradient-to-r from-[var(--theme-border)] to-transparent" />
      </div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-4 gap-3"
      >
        {suggestedApps.map((app) => {
          const isPinned = settings?.pinned_apps.includes(app.id);
          
          return (
            <motion.button
              key={app.id}
              variants={itemVariants}
              whileHover={{ 
                scale: 1.05, 
                y: -4,
                transition: { duration: 0.2, ease: "easeOut" }
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAppClick(app)}
              onContextMenu={(e) => handleContextMenu(e, app)}
              className={cn(
                "group relative flex flex-col items-center gap-2 p-3 rounded-xl",
                "bg-[var(--theme-bg-secondary)]50 hover:bg-[var(--theme-bg-tertiary)]",
                "border border-transparent hover:border-[var(--theme-accent)]30",
                "transition-colors duration-200",
                "focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]50 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg)]",
                isPinned && "border-[var(--theme-accent)]20"
              )}
              title={`${app.title}${isPinned ? " (pinned)" : ""}\nRight-click to ${isPinned ? "unpin" : "pin"}`}
            >
              {/* Pinned indicator */}
              {isPinned && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--theme-accent)] flex items-center justify-center shadow-lg"
                  style={{
                    boxShadow: `0 2px 10px var(--theme-accent)50`,
                  }}
                >
                  <Pin className="h-2.5 w-2.5 text-[var(--theme-bg)]" />
                </motion.div>
              )}
              
              {/* App icon */}
              <motion.div 
                className={cn(
                  "app-icon w-14 h-14 rounded-2xl flex items-center justify-center text-2xl",
                  "bg-gradient-to-br from-[var(--theme-bg-tertiary)] to-[var(--theme-bg-secondary)]",
                  "group-hover:from-[var(--theme-accent)]20 group-hover:to-[var(--theme-accent-secondary,var(--theme-accent))]10",
                  "shadow-sm group-hover:shadow-lg transition-all duration-300"
                )}
                style={{
                  boxShadow: isPinned ? `0 4px 15px -2px var(--theme-accent)30` : undefined,
                }}
              >
                {getIconDisplay(app.icon)}
              </motion.div>
              
              {/* App name */}
              <span className="text-xs font-medium text-center truncate w-full px-1 text-[var(--theme-fg)] group-hover:text-[var(--theme-fg)]">
                {app.title}
              </span>
              
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  boxShadow: `inset 0 1px 0 0 var(--theme-fg)08, 0 0 20px -5px var(--theme-accent)30`,
                }}
              />
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

