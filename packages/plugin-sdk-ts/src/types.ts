/**
 * Core types for Launcher plugins
 */

/**
 * A search result returned by a plugin
 */
export interface SearchResult {
  /** Unique identifier for this result */
  id: string;
  /** Primary display text */
  title: string;
  /** Secondary display text */
  subtitle?: string;
  /** Icon URL, emoji, or icon name */
  icon?: string;
  /** Relevance score (higher = more relevant) */
  score?: number;
  /** Category for grouping results */
  category?: string;
  /** Action to execute when selected */
  action?: PluginAction;
}

/**
 * Action to execute when a search result is selected
 */
export type PluginAction =
  | { type: 'open_url'; value: string }
  | { type: 'copy'; value: string }
  | { type: 'run_command'; value: string }
  | { type: 'custom'; value: string };

/**
 * Input provided to the search function
 */
export interface SearchInput {
  query: string;
}

/**
 * Output returned from the search function
 */
export interface SearchOutput {
  results: SearchResult[];
}

/**
 * Plugin manifest describing a plugin
 */
export interface PluginManifest {
  /** Unique plugin identifier (e.g., "com.example.my-plugin") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  /** Plugin author */
  author?: string;
  /** Short description */
  description?: string;
  /** Required permissions */
  permissions: PluginPermission[];
  /** WASM entry file */
  entry: string;
  /** Features provided by this plugin */
  provides: PluginProvides;
  /** OAuth configuration */
  oauth?: Record<string, OAuthConfig>;
  /** AI tool schemas - maps tool name to schema definition */
  ai_tool_schemas?: Record<string, AIToolSchema>;
}

/**
 * Features provided by a plugin
 */
export interface PluginProvides {
  /** Search providers */
  providers?: string[];
  /** Actions */
  actions?: string[];
  /** AI tools - tool names that this plugin provides */
  ai_tools?: string[];
}

/**
 * OAuth configuration for a provider
 */
export interface OAuthConfig {
  scopes: string[];
}

/**
 * AI Tool Schema - describes a tool the AI can invoke
 */
export interface AIToolSchema {
  /** Human-readable description of what the tool does */
  description: string;
  /** JSON Schema for tool parameters */
  parameters: AIToolParameters;
}

/**
 * AI Tool Parameters - JSON Schema object
 */
export interface AIToolParameters {
  type: 'object';
  properties: Record<string, AIToolProperty>;
  required?: string[];
}

/**
 * AI Tool Property - describes a single parameter
 */
export interface AIToolProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  default?: unknown;
}

/**
 * AI Tool Execution Input
 */
export interface AIToolInput {
  /** Tool name being executed */
  tool: string;
  /** Tool arguments as JSON */
  arguments: Record<string, unknown>;
}

/**
 * AI Tool Execution Output
 */
export interface AIToolOutput {
  /** Result of the tool execution (JSON string) */
  result: string;
  /** Whether the execution resulted in an error */
  isError?: boolean;
}

/**
 * Plugin permissions
 */
export type PluginPermission =
  | 'network'
  | 'filesystem:read'
  | 'filesystem:write'
  | 'clipboard'
  | 'notifications'
  | `oauth:${string}`;

/**
 * HTTP request configuration
 */
export interface HttpRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
}

/**
 * HTTP response
 */
export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Plugin configuration storage
 */
export interface PluginConfig {
  values: Record<string, unknown>;
}

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';


