import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, X, Plus, Grid3X3, LayoutGrid } from "lucide-react";
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
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="p-4 flex-1 min-h-0 overflow-hidden flex flex-col gap-4"
    >
      {/* Edit Mode Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {editMode && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs text-primary font-medium"
            >
              Editing Dashboard
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {editMode && (
            <>
              {/* Grid toggle */}
              <button
                onClick={handleToggleGrid}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  settings.dashboard_settings.show_grid
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                title={settings.dashboard_settings.show_grid ? "Hide grid" : "Show grid"}
              >
                {settings.dashboard_settings.show_grid ? (
                  <Grid3X3 className="h-4 w-4" />
                ) : (
                  <LayoutGrid className="h-4 w-4" />
                )}
              </button>

              {/* Snap toggle */}
              <button
                onClick={handleToggleSnap}
                className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                  settings.dashboard_settings.snap_to_grid
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                title={settings.dashboard_settings.snap_to_grid ? "Disable snap to grid" : "Enable snap to grid"}
              >
                SNAP
              </button>

              {/* Add widget */}
              <button
                onClick={() => setShowWidgetPicker(true)}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  "bg-primary/10 text-primary hover:bg-primary/20"
                )}
                title="Add Widget"
              >
                <Plus className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            onClick={() => setEditMode(!editMode)}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              editMode
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
            title={editMode ? "Done editing" : "Edit dashboard"}
          >
            {editMode ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </button>
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
