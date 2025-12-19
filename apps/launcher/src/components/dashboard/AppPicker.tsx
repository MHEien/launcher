import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { SearchResult } from "@/types";
import { cn } from "@/lib/utils";

interface AppPickerProps {
  onClose: () => void;
  onSelect: (app: SearchResult) => void;
  excludeIds?: string[];
}

export function AppPicker({ onClose, onSelect, excludeIds = [] }: AppPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [apps, setApps] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<SearchResult | null>(null);

  // Load all apps on mount
  useEffect(() => {
    const loadApps = async () => {
      setIsLoading(true);
      try {
        // Search with a common character to get most apps
        // The search function doesn't return results for empty queries
        // Using "a" as it will match most application names
        const results = await invoke<SearchResult[]>("search", { query: "a" });
        // Filter to only applications and remove duplicates
        const appMap = new Map<string, SearchResult>();
        results.forEach((r) => {
          if (r.category === "Application" && !excludeIds.includes(r.id)) {
            appMap.set(r.id, r);
          }
        });
        
        // Also try a few more common characters to get more apps
        const queries = ["e", "i", "o", "u", "s", "t", "n"];
        for (const query of queries) {
          const moreResults = await invoke<SearchResult[]>("search", { query });
          moreResults.forEach((r) => {
            if (r.category === "Application" && !excludeIds.includes(r.id) && !appMap.has(r.id)) {
              appMap.set(r.id, r);
            }
          });
        }
        
        // Sort by title
        const appResults = Array.from(appMap.values()).sort((a, b) =>
          a.title.localeCompare(b.title)
        );
        setApps(appResults);
      } catch (error) {
        console.error("Failed to load apps:", error);
        setApps([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadApps();
  }, [excludeIds]);

  // Filter apps based on search query
  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) {
      return apps;
    }

    const query = searchQuery.toLowerCase();
    return apps.filter(
      (app) =>
        app.title.toLowerCase().includes(query) ||
        app.subtitle?.toLowerCase().includes(query)
    );
  }, [apps, searchQuery]);

  const handleSelect = (app: SearchResult) => {
    setSelectedApp(app);
    onSelect(app);
    onClose();
  };

  const getIconDisplay = (icon: SearchResult["icon"]): string => {
    if (icon.type === "Emoji") return icon.value;
    if (icon.type === "Text") return icon.value;
    return "📦";
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="bg-popover border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Add Application</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search applications..."
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>

          {/* App list */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Loading applications...
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                {searchQuery ? "No applications found" : "No applications available"}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleSelect(app)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-md",
                      "hover:bg-accent hover:text-accent-foreground",
                      "transition-colors text-left"
                    )}
                  >
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-lg">
                      {getIconDisplay(app.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{app.title}</div>
                      {app.subtitle && (
                        <div className="text-xs text-muted-foreground truncate">
                          {app.subtitle}
                        </div>
                      )}
                    </div>
                    {selectedApp?.id === app.id && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

