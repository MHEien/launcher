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
  | "GitHub";

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
  homepage: string | null;
  repository: string | null;
  download_url: string;
  checksum: string | null;
  permissions: string[];
  categories: string[];
  downloads: number;
  rating: number | null;
}

export interface PluginUpdate {
  id: string;
  name: string;
  current_version: string;
  latest_version: string;
}
