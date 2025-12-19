import type { LucideIcon } from "lucide-react";

// Configuration field types
export type ConfigFieldType = 
  | "text" 
  | "number" 
  | "toggle" 
  | "select" 
  | "color" 
  | "slider" 
  | "path"
  | "shortcut-list"
  | "app-list";

// Base configuration field
export interface ConfigFieldBase {
  key: string;
  label: string;
  description?: string;
  required?: boolean;
}

// Text input field
export interface TextConfigField extends ConfigFieldBase {
  type: "text";
  placeholder?: string;
  maxLength?: number;
}

// Number input field
export interface NumberConfigField extends ConfigFieldBase {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
}

// Toggle field
export interface ToggleConfigField extends ConfigFieldBase {
  type: "toggle";
  defaultValue?: boolean;
}

// Select field
export interface SelectConfigField extends ConfigFieldBase {
  type: "select";
  options: Array<{ value: string; label: string }>;
}

// Color picker field
export interface ColorConfigField extends ConfigFieldBase {
  type: "color";
  showAlpha?: boolean;
}

// Slider field
export interface SliderConfigField extends ConfigFieldBase {
  type: "slider";
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

// Path picker field
export interface PathConfigField extends ConfigFieldBase {
  type: "path";
  pathType: "file" | "directory";
  filters?: Array<{ name: string; extensions: string[] }>;
}

// Shortcut list field (for quick actions)
export interface ShortcutListConfigField extends ConfigFieldBase {
  type: "shortcut-list";
  maxItems?: number;
}

// App list field (for folder widget)
export interface AppListConfigField extends ConfigFieldBase {
  type: "app-list";
  maxItems?: number;
}

// Union of all config field types
export type ConfigField = 
  | TextConfigField
  | NumberConfigField
  | ToggleConfigField
  | SelectConfigField
  | ColorConfigField
  | SliderConfigField
  | PathConfigField
  | ShortcutListConfigField
  | AppListConfigField;

// Widget configuration schema
export interface WidgetConfigSchema {
  fields: ConfigField[];
}

// Widget size constraints
export interface WidgetSizeConstraints {
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
  defaultWidth: number;
  defaultHeight: number;
}

// Widget category
export type WidgetCategory = 
  | "utility" 
  | "productivity" 
  | "system" 
  | "media" 
  | "social" 
  | "development"
  | "layout";

// Widget definition for the registry
export interface WidgetDefinition {
  // Unique identifier for the widget type
  id: string;
  // Display name
  name: string;
  // Description
  description: string;
  // Icon component name (from lucide-react)
  icon: string;
  // Category for organization
  category: WidgetCategory;
  // Whether multiple instances are allowed
  allowMultiple: boolean;
  // Size constraints
  sizeConstraints: WidgetSizeConstraints;
  // Configuration schema
  configSchema?: WidgetConfigSchema;
  // Tags for searching
  tags?: string[];
  // Whether this is a core widget or plugin
  isCore: boolean;
  // Plugin ID if this is a plugin widget
  pluginId?: string;
}

// Default configuration values for widgets
export type WidgetDefaultConfig = Record<string, unknown>;

// Widget instance with runtime data
export interface WidgetInstance {
  instanceId: string;
  widgetType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  config: Record<string, unknown> | null;
}

