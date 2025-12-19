import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, X, Plus, Grid3X3, LayoutGrid, Sparkles } from "lucide-react";
import { useSettingsStore } from "@/stores/settings";
import { SuggestedApps } from "./SuggestedApps";
import { WidgetCanvas } from "./WidgetCanvas";
import { WidgetPicker } from "./WidgetPicker";
import { WidgetConfigPanel } from "./WidgetConfigPanel";
import { cn } from "@/lib/utils";

export function Dashboard() {
  const { 
    settings, 
    isInitialized, 
    loadSettings, 
    updateDashboardSettings,
    configPanelOpen,
    closeConfigPanel,
  } = useSettingsStore();
  const [editMode, setEditMode] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      loadSettings();
    }
  }, [isInitialized, loadSettings]);

  // Close config panel when exiting edit mode
  useEffect(() => {
    if (!editMode && configPanelOpen) {
      closeConfigPanel();
    }
  }, [editMode, configPanelOpen, closeConfigPanel]);

  if (!isInitialized || !settings) {
    return null;
  }

  if (!settings.dashboard_enabled) {
    return null;
  }

  const handleToggleGrid = () => {
    updateDashboardSettings({ 
      show_grid: !settings.dashboard_settings.show_grid 
    });
  };

  const handleToggleSnap = () => {
    updateDashboardSettings({ 
      snap_to_grid: !settings.dashboard_settings.snap_to_grid 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.2, ease: [0.175, 0.885, 0.32, 1.275] }}
      className="p-4 flex-1 min-h-0 overflow-hidden flex flex-col gap-4"
    >
      {/* Edit Mode Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {editMode && (
              <motion.div
                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.9 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--theme-accent)]15 border border-[var(--theme-accent)]30"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                >
                  <Sparkles className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                </motion.div>
                <span className="text-xs font-semibold text-[var(--theme-accent)]">
                  Edit Mode
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-1.5">
          <AnimatePresence>
            {editMode && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-1.5"
              >
                {/* Grid toggle */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleToggleGrid}
                  className={cn(
                    "p-2 rounded-lg transition-all duration-200",
                    settings.dashboard_settings.show_grid
                      ? "bg-[var(--theme-accent)]20 text-[var(--theme-accent)] shadow-sm"
                      : "text-[var(--theme-fg-muted)] hover:bg-[var(--theme-hover)] hover:text-[var(--theme-fg)]"
                  )}
                  style={settings.dashboard_settings.show_grid ? {
                    boxShadow: `0 2px 10px var(--theme-accent)30`,
                  } : undefined}
                  title={settings.dashboard_settings.show_grid ? "Hide grid" : "Show grid"}
                >
                  {settings.dashboard_settings.show_grid ? (
                    <Grid3X3 className="h-4 w-4" />
                  ) : (
                    <LayoutGrid className="h-4 w-4" />
                  )}
                </motion.button>

                {/* Snap toggle */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleToggleSnap}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all duration-200",
                    settings.dashboard_settings.snap_to_grid
                      ? "bg-[var(--theme-accent)]20 text-[var(--theme-accent)] shadow-sm"
                      : "text-[var(--theme-fg-muted)] hover:bg-[var(--theme-hover)] hover:text-[var(--theme-fg)]"
                  )}
                  style={settings.dashboard_settings.snap_to_grid ? {
                    boxShadow: `0 2px 10px var(--theme-accent)30`,
                  } : undefined}
                  title={settings.dashboard_settings.snap_to_grid ? "Disable snap to grid" : "Enable snap to grid"}
                >
                  SNAP
                </motion.button>

                {/* Add widget */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowWidgetPicker(true)}
                  className="p-2 rounded-lg bg-[var(--theme-accent)] text-[var(--theme-bg)] transition-all duration-200 shadow-lg"
                  style={{
                    boxShadow: `0 4px 15px var(--theme-accent)40`,
                  }}
                  title="Add Widget"
                >
                  <Plus className="h-4 w-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setEditMode(!editMode)}
            className={cn(
              "p-2 rounded-lg transition-all duration-200",
              editMode
                ? "bg-[var(--theme-accent)]20 text-[var(--theme-accent)]"
                : "text-[var(--theme-fg-muted)] hover:bg-[var(--theme-hover)] hover:text-[var(--theme-fg)]"
            )}
            title={editMode ? "Done editing" : "Edit dashboard"}
          >
            {editMode ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </motion.button>
        </div>
      </div>

      {/* Suggested Apps Section */}
      {settings.show_suggested_apps && !editMode && (
        <SuggestedApps />
      )}

      {/* Widget Canvas - takes remaining space */}
      <div className="flex-1 min-h-0 relative">
        <WidgetCanvas editMode={editMode} disabled={showWidgetPicker || configPanelOpen} />
        
        {/* Config Panel Overlay */}
        <AnimatePresence>
          {configPanelOpen && editMode && (
            <WidgetConfigPanel />
          )}
        </AnimatePresence>
      </div>

      {/* Widget Picker Modal */}
      <AnimatePresence>
        {showWidgetPicker && (
          <WidgetPicker onClose={() => setShowWidgetPicker(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
