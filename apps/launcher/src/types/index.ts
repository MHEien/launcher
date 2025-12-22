// Re-export AI types
export * from "./ai";

// Re-export Codex types
export * from "./codex";

// Re-export Widget types
export * from "./widget";

// Re-export Pro types
export * from "./pro";

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string | null;
  icon: ResultIcon;
  category: ResultCategory;
  score: number;
}

export type ResultIcon =
  | { type: "Text"; value: string }
  | { type: "Path"; value: string }
  | { type: "Emoji"; value: string };

export type ResultCategory =
  | "Calculator"
  | "Application"
  | "File"
  | "Command"
  | "Plugin"
  | "GitHub"
  | "WebSearch"
  | "URL"
  | "System";

// Command types for prefix-based triggers (e.g., "codex:", "ai:")
export type CommandSource =
  | { type: "BuiltIn" }
  | { type: "Plugin"; value: string };

export interface Command {
  id: string;
  trigger: string;
  name: string;
  description: string;
  icon: string | null;
  source: CommandSource;
  enabled: boolean;
}

export interface SystemTheme {
  is_dark: boolean;
  accent_color: string | null;
  window_blur_supported: boolean;
}

export interface IndexingStatus {
  is_indexing: boolean;
  files_indexed: number;
  message: string;
}

export interface IndexConfig {
  index_paths: string[];
  exclude_patterns: string[];
  exclude_hidden: boolean;
  max_file_size_mb: number;
  index_content: boolean;
  content_extensions: string[];
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  author: string | null;
  description: string | null;
  permissions: string[];
  entry: string;
  enabled: boolean;
}

export type PluginManifest = PluginInfo;

export interface OAuthProviderInfo {
  id: string;
  name: string;
  connected: boolean;
}

export interface OAuthCredentials {
  client_id: string | null;
  client_secret: string | null;
}

export interface RegistryPlugin {
  id: string;
  name: string;
  version: string;
  author: string | null;
  description: string | null;
  icon_url: string | null;
  homepage: string | null;
  repository: string | null;
  download_url: string;
  checksum: string | null;
  permissions: string[];
  categories: string[];
  downloads: number;
  rating: number | null;
  verified: boolean;
  featured: boolean;
}

export interface MarketplaceResponse {
  plugins: RegistryPlugin[];
  total: number;
  has_more: boolean;
  is_offline: boolean;
  last_updated: number | null; // Unix timestamp in seconds
}

export interface PluginUpdate {
  id: string;
  name: string;
  current_version: string;
  latest_version: string;
}

// Settings types
export type ThemeMode = "system" | "light" | "dark";

export type WidgetShadow = "none" | "sm" | "md" | "lg";

// Per-widget theme overrides
export interface WidgetTheme {
  background?: string;
  background_opacity?: number;
  text_color?: string;
  accent_color?: string;
  border_color?: string;
  border_radius?: number;
  border_width?: number;
  shadow?: WidgetShadow;
}

// Widget placement with free-form positioning
export interface WidgetPlacement {
  instance_id: string;
  widget_type: string;
  plugin_id: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  config: Record<string, unknown> | null;
  theme_overrides?: WidgetTheme | null;
}

// Dashboard settings
export interface DashboardSettings {
  snap_to_grid: boolean;
  grid_size: number;
  show_grid: boolean;
}

// Background type for launcher
export type BackgroundType = "solid" | "gradient" | "image";

// Global launcher theme settings
export interface LauncherTheme {
  background_type: BackgroundType;
  background_color?: string;
  gradient_colors?: [string, string];
  gradient_angle: number;
  background_image?: string;
  blur_intensity: number;
  opacity: number;
  accent_color?: string;
}

export interface UserSettings {
  // Window
  window_position: [number, number] | null;
  window_size: [number, number] | null;

  // Dashboard
  dashboard_enabled: boolean;
  widget_layout: WidgetPlacement[];
  pinned_apps: string[];
  show_suggested_apps: boolean;
  suggested_apps_count: number;
  dashboard_settings: DashboardSettings;

  // Behavior
  show_on_startup: boolean;
  close_on_blur: boolean;
  theme_mode: ThemeMode;

  // Global shortcut
  custom_shortcut: string | null;

  // Launcher theme
  launcher_theme: LauncherTheme;
}

// Plugin Widget Types
export interface PluginWidgetDefinition {
  id: string;
  plugin_id: string;
  name: string;
  description: string | null;
  sizes: string[];
  refresh_interval: number;
  category: string | null;
}

export interface WidgetData {
  type: "list" | "grid" | "stat" | "custom";
  items?: WidgetItem[];
  title?: string;
  value?: string;
  subtitle?: string;
  html?: string;
}

export interface WidgetItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  action?: string;
}

// Shortcut configuration result from backend
export interface ShortcutResult {
  success: boolean;
  shortcut: string | null;
  error: string | null;
}