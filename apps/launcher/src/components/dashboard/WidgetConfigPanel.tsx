import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { X, RotateCcw, Palette, Settings2 } from "lucide-react";
import { useSettingsStore } from "@/stores/settings";
import { widgetRegistry } from "@/lib/widgetRegistry";
import type { ConfigField, WidgetTheme } from "@/types";
import { cn } from "@/lib/utils";

// Tab type
type ConfigTab = "settings" | "appearance";

export function WidgetConfigPanel() {
  const { 
    settings, 
    selectedWidgetId, 
    closeConfigPanel,
    updateWidgetConfig,
    updateWidgetTheme,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<ConfigTab>("settings");
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({});
  const [localTheme, setLocalTheme] = useState<WidgetTheme>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Get the selected widget
  const selectedWidget = useMemo(() => {
    if (!settings || !selectedWidgetId) return null;
    return settings.widget_layout.find((w) => w.instance_id === selectedWidgetId);
  }, [settings, selectedWidgetId]);

  // Get the widget definition
  const widgetDef = useMemo(() => {
    if (!selectedWidget) return null;
    return widgetRegistry.get(selectedWidget.widget_type);
  }, [selectedWidget]);

  // Initialize local state when widget changes
  useEffect(() => {
    if (selectedWidget) {
      setLocalConfig(selectedWidget.config || {});
      setLocalTheme(selectedWidget.theme_overrides || {});
      setHasChanges(false);
    }
  }, [selectedWidget]);

  // Handle config change
  const handleConfigChange = useCallback((key: string, value: unknown) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  // Handle theme change
  const handleThemeChange = useCallback((key: keyof WidgetTheme, value: unknown) => {
    setLocalTheme((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  // Save changes
  const handleSave = useCallback(async () => {
    if (!selectedWidgetId) return;
    
    await updateWidgetConfig(selectedWidgetId, localConfig);
    await updateWidgetTheme(selectedWidgetId, Object.keys(localTheme).length > 0 ? localTheme : null);
    setHasChanges(false);
  }, [selectedWidgetId, localConfig, localTheme, updateWidgetConfig, updateWidgetTheme]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    if (!widgetDef) return;
    const defaultConfig = widgetRegistry.getDefaultConfig(widgetDef.id);
    setLocalConfig(defaultConfig);
    setLocalTheme({});
    setHasChanges(true);
  }, [widgetDef]);

  // Auto-save on change (debounced)
  useEffect(() => {
    if (!hasChanges) return;
    
    const timer = setTimeout(() => {
      handleSave();
    }, 500);

    return () => clearTimeout(timer);
  }, [hasChanges, handleSave]);

  if (!selectedWidget || !widgetDef) {
    return null;
  }

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={cn(
        "absolute right-0 top-0 bottom-0 w-80",
        "bg-background/95 backdrop-blur-xl",
        "border-l border-border/30",
        "shadow-2xl z-50",
        "flex flex-col"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{widgetDef.name}</h3>
          {hasChanges && (
            <span className="text-[10px] text-primary px-1.5 py-0.5 rounded bg-primary/10">
              Saving...
            </span>
          )}
        </div>
        <button
          onClick={closeConfigPanel}
          className="p-1 rounded-md hover:bg-muted/50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30">
        <button
          onClick={() => setActiveTab("settings")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm transition-colors",
            activeTab === "settings"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings2 className="h-4 w-4" />
          Settings
        </button>
        <button
          onClick={() => setActiveTab("appearance")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm transition-colors",
            activeTab === "appearance"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Palette className="h-4 w-4" />
          Appearance
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "settings" && (
          <SettingsTab
            schema={widgetDef.configSchema}
            config={localConfig}
            onChange={handleConfigChange}
          />
        )}
        {activeTab === "appearance" && (
          <AppearanceTab
            theme={localTheme}
            onChange={handleThemeChange}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/30 flex items-center justify-between">
        <button
          onClick={handleReset}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md",
            "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            "transition-colors"
          )}
        >
          <RotateCcw className="h-3 w-3" />
          Reset to Defaults
        </button>
        <button
          onClick={closeConfigPanel}
          className={cn(
            "px-4 py-1.5 text-xs rounded-md",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "transition-colors"
          )}
        >
          Done
        </button>
      </div>
    </motion.div>
  );
}

// Settings Tab Component
interface SettingsTabProps {
  schema?: { fields: ConfigField[] };
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

function SettingsTab({ schema, config, onChange }: SettingsTabProps) {
  if (!schema || schema.fields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No settings available</p>
        <p className="text-xs mt-1">This widget has no configurable options</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {schema.fields.map((field) => (
        <ConfigFieldInput
          key={field.key}
          field={field}
          value={config[field.key]}
          onChange={(value) => onChange(field.key, value)}
        />
      ))}
    </div>
  );
}

// Config Field Input Component
interface ConfigFieldInputProps {
  field: ConfigField;
  value: unknown;
  onChange: (value: unknown) => void;
}

function ConfigFieldInput({ field, value, onChange }: ConfigFieldInputProps) {
  const renderInput = () => {
    switch (field.type) {
      case "toggle":
        return (
          <button
            onClick={() => onChange(!value)}
            className={cn(
              "relative w-10 h-5 rounded-full transition-colors",
              value ? "bg-primary" : "bg-muted"
            )}
          >
            <div
              className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                value ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        );

      case "select":
        return (
          <select
            value={value as string || field.options[0]?.value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "w-full px-3 py-1.5 rounded-md text-sm",
              "bg-muted/30 border border-border/30",
              "focus:outline-none focus:ring-2 focus:ring-primary/50"
            )}
          >
            {field.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case "text":
        return (
          <input
            type="text"
            value={value as string || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            className={cn(
              "w-full px-3 py-1.5 rounded-md text-sm",
              "bg-muted/30 border border-border/30",
              "focus:outline-none focus:ring-2 focus:ring-primary/50"
            )}
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={value as number || field.min || 0}
            onChange={(e) => onChange(Number(e.target.value))}
            min={field.min}
            max={field.max}
            step={field.step}
            className={cn(
              "w-full px-3 py-1.5 rounded-md text-sm",
              "bg-muted/30 border border-border/30",
              "focus:outline-none focus:ring-2 focus:ring-primary/50"
            )}
          />
        );

      case "slider":
        return (
          <div className="flex items-center gap-3">
            <input
              type="range"
              value={value as number || field.min}
              onChange={(e) => onChange(Number(e.target.value))}
              min={field.min}
              max={field.max}
              step={field.step || 1}
              className="flex-1 h-2 rounded-full bg-muted appearance-none cursor-pointer accent-primary"
            />
            <span className="text-xs text-muted-foreground w-12 text-right">
              {value as number || field.min}{field.unit || ""}
            </span>
          </div>
        );

      case "color":
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value as string || "#000000"}
              onChange={(e) => onChange(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-border/30"
            />
            <input
              type="text"
              value={value as string || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className={cn(
                "flex-1 px-3 py-1.5 rounded-md text-sm font-mono",
                "bg-muted/30 border border-border/30",
                "focus:outline-none focus:ring-2 focus:ring-primary/50"
              )}
            />
          </div>
        );

      case "path":
        return (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={value as string || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.pathType === "directory" ? "/path/to/directory" : "/path/to/file"}
              className={cn(
                "flex-1 px-3 py-1.5 rounded-md text-sm",
                "bg-muted/30 border border-border/30",
                "focus:outline-none focus:ring-2 focus:ring-primary/50"
              )}
            />
            {/* TODO: Add file/folder picker button */}
          </div>
        );

      default:
        return (
          <div className="text-xs text-muted-foreground">
            Unsupported field type: {field.type}
          </div>
        );
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{field.label}</label>
        {field.type === "toggle" && renderInput()}
      </div>
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
      {field.type !== "toggle" && (
        <div className="mt-1.5">{renderInput()}</div>
      )}
    </div>
  );
}

// Appearance Tab Component
interface AppearanceTabProps {
  theme: WidgetTheme;
  onChange: (key: keyof WidgetTheme, value: unknown) => void;
}

function AppearanceTab({ theme, onChange }: AppearanceTabProps) {
  return (
    <div className="space-y-4">
      {/* Background */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Background Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={theme.background || "#1a1a1a"}
            onChange={(e) => onChange("background", e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-border/30"
          />
          <input
            type="text"
            value={theme.background || ""}
            onChange={(e) => onChange("background", e.target.value)}
            placeholder="transparent"
            className={cn(
              "flex-1 px-3 py-1.5 rounded-md text-sm font-mono",
              "bg-muted/30 border border-border/30",
              "focus:outline-none focus:ring-2 focus:ring-primary/50"
            )}
          />
        </div>
      </div>

      {/* Background Opacity */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Background Opacity</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            value={theme.background_opacity ?? 100}
            onChange={(e) => onChange("background_opacity", Number(e.target.value))}
            min={0}
            max={100}
            className="flex-1 h-2 rounded-full bg-muted appearance-none cursor-pointer accent-primary"
          />
          <span className="text-xs text-muted-foreground w-12 text-right">
            {theme.background_opacity ?? 100}%
          </span>
        </div>
      </div>

      {/* Text Color */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Text Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={theme.text_color || "#ffffff"}
            onChange={(e) => onChange("text_color", e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-border/30"
          />
          <input
            type="text"
            value={theme.text_color || ""}
            onChange={(e) => onChange("text_color", e.target.value)}
            placeholder="inherit"
            className={cn(
              "flex-1 px-3 py-1.5 rounded-md text-sm font-mono",
              "bg-muted/30 border border-border/30",
              "focus:outline-none focus:ring-2 focus:ring-primary/50"
            )}
          />
        </div>
      </div>

      {/* Accent Color */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Accent Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={theme.accent_color || "#3b82f6"}
            onChange={(e) => onChange("accent_color", e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-border/30"
          />
          <input
            type="text"
            value={theme.accent_color || ""}
            onChange={(e) => onChange("accent_color", e.target.value)}
            placeholder="inherit"
            className={cn(
              "flex-1 px-3 py-1.5 rounded-md text-sm font-mono",
              "bg-muted/30 border border-border/30",
              "focus:outline-none focus:ring-2 focus:ring-primary/50"
            )}
          />
        </div>
      </div>

      {/* Border */}
      <div className="space-y-3 pt-2 border-t border-border/30">
        <h4 className="text-xs font-medium text-muted-foreground uppercase">Border</h4>
        
        {/* Border Color */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.border_color || "#3a3a3a"}
              onChange={(e) => onChange("border_color", e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-border/30"
            />
            <input
              type="text"
              value={theme.border_color || ""}
              onChange={(e) => onChange("border_color", e.target.value)}
              placeholder="none"
              className={cn(
                "flex-1 px-3 py-1.5 rounded-md text-sm font-mono",
                "bg-muted/30 border border-border/30",
                "focus:outline-none focus:ring-2 focus:ring-primary/50"
              )}
            />
          </div>
        </div>

        {/* Border Width */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Width</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              value={theme.border_width ?? 0}
              onChange={(e) => onChange("border_width", Number(e.target.value))}
              min={0}
              max={8}
              className="flex-1 h-2 rounded-full bg-muted appearance-none cursor-pointer accent-primary"
            />
            <span className="text-xs text-muted-foreground w-12 text-right">
              {theme.border_width ?? 0}px
            </span>
          </div>
        </div>

        {/* Border Radius */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Radius</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              value={theme.border_radius ?? 8}
              onChange={(e) => onChange("border_radius", Number(e.target.value))}
              min={0}
              max={32}
              className="flex-1 h-2 rounded-full bg-muted appearance-none cursor-pointer accent-primary"
            />
            <span className="text-xs text-muted-foreground w-12 text-right">
              {theme.border_radius ?? 8}px
            </span>
          </div>
        </div>
      </div>

      {/* Shadow */}
      <div className="space-y-1.5 pt-2 border-t border-border/30">
        <label className="text-sm font-medium">Shadow</label>
        <div className="flex gap-2">
          {(["none", "sm", "md", "lg"] as const).map((shadow) => (
            <button
              key={shadow}
              onClick={() => onChange("shadow", shadow)}
              className={cn(
                "flex-1 px-3 py-1.5 text-xs rounded-md transition-colors",
                "border",
                theme.shadow === shadow
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/30 text-muted-foreground hover:bg-muted/30"
              )}
            >
              {shadow === "none" ? "None" : shadow.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

