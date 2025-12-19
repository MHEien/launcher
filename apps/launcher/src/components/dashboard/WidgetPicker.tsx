import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Search, Check, Clock, Zap, FileText, Puzzle, TerminalSquare, Square, Folder, Calculator, Minus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "@/stores/settings";
import { widgetRegistry } from "@/lib/widgetRegistry";
import type { PluginWidgetDefinition, WidgetPlacement, WidgetDefinition, WidgetCategory } from "@/types";
import { cn } from "@/lib/utils";

interface WidgetPickerProps {
  onClose: () => void;
}

// Icon mapping for widget types
const ICON_MAP: Record<string, React.ReactNode> = {
  Clock: <Clock className="h-5 w-5" />,
  TerminalSquare: <TerminalSquare className="h-5 w-5" />,
  Zap: <Zap className="h-5 w-5" />,
  FileText: <FileText className="h-5 w-5" />,
  Square: <Square className="h-5 w-5" />,
  Folder: <Folder className="h-5 w-5" />,
  Calculator: <Calculator className="h-5 w-5" />,
  Minus: <Minus className="h-5 w-5" />,
};

// Category labels
const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  utility: "Utility",
  productivity: "Productivity",
  system: "System",
  media: "Media",
  social: "Social",
  development: "Development",
  layout: "Layout",
};

export function WidgetPicker({ onClose }: WidgetPickerProps) {
  const { settings, addWidget } = useSettingsStore();
  const [pluginWidgets, setPluginWidgets] = useState<PluginWidgetDefinition[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | "all">("all");

  useEffect(() => {
    loadPluginWidgets();
  }, []);

  const loadPluginWidgets = async () => {
    try {
      const widgets = await invoke<PluginWidgetDefinition[]>("get_plugin_widgets");
      setPluginWidgets(widgets);
    } catch (error) {
      console.error("Failed to load plugin widgets:", error);
    }
  };

  // Get count of widgets by type
  const getWidgetCount = (widgetType: string, pluginId?: string) => {
    return settings?.widget_layout.filter(
      (w) => w.widget_type === widgetType && w.plugin_id === (pluginId || null)
    ).length || 0;
  };

  // Check if widget can be added (respects allowMultiple)
  const canAddWidget = (widgetDef: WidgetDefinition) => {
    if (widgetDef.allowMultiple) return true;
    return getWidgetCount(widgetDef.id) === 0;
  };

  // Filter widgets based on search and category
  const filteredWidgets = useMemo(() => {
    let widgets = widgetRegistry.getCoreWidgets();
    
    if (searchQuery) {
      widgets = widgetRegistry.search(searchQuery);
    }
    
    if (selectedCategory !== "all") {
      widgets = widgets.filter((w) => w.category === selectedCategory);
    }
    
    return widgets;
  }, [searchQuery, selectedCategory]);

  // Group widgets by category
  const widgetsByCategory = useMemo(() => {
    const grouped: Record<string, WidgetDefinition[]> = {};
    
    filteredWidgets.forEach((widget) => {
      const category = widget.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(widget);
    });
    
    return grouped;
  }, [filteredWidgets]);

  // Get available categories
  const availableCategories = useMemo(() => {
    const categories = new Set(widgetRegistry.getCoreWidgets().map((w) => w.category));
    return Array.from(categories) as WidgetCategory[];
  }, []);

  const handleAddWidget = async (widgetDef: WidgetDefinition) => {
    if (!canAddWidget(widgetDef)) return;

    // Generate unique instance ID
    const instanceId = `${widgetDef.id}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    // Calculate position (stack new widgets)
    const existingWidgets = settings?.widget_layout || [];
    const maxY = existingWidgets.reduce((max, w) => Math.max(max, w.y + w.height), 0);
    
    const newWidget: WidgetPlacement = {
      instance_id: instanceId,
      widget_type: widgetDef.id,
      plugin_id: null,
      x: 0,
      y: maxY > 0 ? maxY + 10 : 0,
      width: widgetDef.sizeConstraints.defaultWidth,
      height: widgetDef.sizeConstraints.defaultHeight,
      z_index: existingWidgets.length,
      config: widgetRegistry.getDefaultConfig(widgetDef.id),
      theme_overrides: null,
    };

    await addWidget(newWidget);
  };

  const handleAddPluginWidget = async (widget: PluginWidgetDefinition) => {
    const instanceId = `${widget.id}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    const existingWidgets = settings?.widget_layout || [];
    const maxY = existingWidgets.reduce((max, w) => Math.max(max, w.y + w.height), 0);
    
    const newWidget: WidgetPlacement = {
      instance_id: instanceId,
      widget_type: widget.id,
      plugin_id: widget.plugin_id,
      x: 0,
      y: maxY > 0 ? maxY + 10 : 0,
      width: 200,
      height: 150,
      z_index: existingWidgets.length,
      config: null,
      theme_overrides: null,
    };

    await addWidget(newWidget);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-w-lg max-h-[80vh]",
          "bg-[var(--launcher-bg)] backdrop-blur-xl",
          "border border-border/30",
          "rounded-xl shadow-2xl overflow-hidden flex flex-col"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 shrink-0">
          <h2 className="text-lg font-semibold">Add Widget</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-border/30 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search widgets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-9 pr-3 py-2 rounded-lg",
                "bg-muted/30 border border-border/30",
                "text-sm placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/50"
              )}
            />
          </div>

          {/* Category filters */}
          <div className="flex gap-1 mt-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "px-2 py-1 rounded-md text-xs transition-colors",
                selectedCategory === "all"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              All
            </button>
            {availableCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-2 py-1 rounded-md text-xs transition-colors",
                  selectedCategory === category
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
        </div>

        {/* Widget List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Core Widgets by Category */}
          {Object.entries(widgetsByCategory).map(([category, widgets]) => (
            <div key={category}>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {CATEGORY_LABELS[category as WidgetCategory]}
              </h3>
              <div className="space-y-2">
                {widgets.map((widget) => {
                  const count = getWidgetCount(widget.id);
                  const canAdd = canAddWidget(widget);

                  return (
                    <div
                      key={widget.id}
                      className={cn(
                        "p-3 rounded-lg border border-border/30",
                        "hover:border-border/50 transition-colors",
                        !canAdd && "opacity-50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted/30 text-primary">
                          {ICON_MAP[widget.icon] || <Puzzle className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{widget.name}</h4>
                              {count > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                                  {count} added
                                </span>
                              )}
                            </div>
                            {canAdd ? (
                              <button
                                onClick={() => handleAddWidget(widget)}
                                className={cn(
                                  "px-2 py-1 text-xs rounded-md",
                                  "bg-primary/10 text-primary hover:bg-primary/20",
                                  "transition-colors"
                                )}
                              >
                                Add
                              </button>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-green-400">
                                <Check className="h-3 w-3" /> Added
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {widget.description}
                          </p>
                          {widget.allowMultiple && (
                            <span className="inline-block text-[10px] text-primary/70 mt-1">
                              Multiple instances allowed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Plugin Widgets */}
          {pluginWidgets.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Plugin Widgets
              </h3>
              <div className="space-y-2">
                {pluginWidgets.map((widget) => {
                  const widgetKey = `${widget.plugin_id}-${widget.id}`;
                  const count = getWidgetCount(widget.id, widget.plugin_id);

                  return (
                    <div
                      key={widgetKey}
                      className="p-3 rounded-lg border border-border/30 hover:border-border/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted/30 text-muted-foreground">
                          <Puzzle className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{widget.name}</h4>
                              {count > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                                  {count} added
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleAddPluginWidget(widget)}
                              className={cn(
                                "px-2 py-1 text-xs rounded-md",
                                "bg-primary/10 text-primary hover:bg-primary/20",
                                "transition-colors"
                              )}
                            >
                              Add
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {widget.description || `From ${widget.plugin_id}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredWidgets.length === 0 && pluginWidgets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Puzzle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No widgets found</p>
              {searchQuery && (
                <p className="text-xs mt-1">Try a different search term</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
