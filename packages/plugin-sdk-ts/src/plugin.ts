/**
 * Plugin base class and decorators for building Launcher plugins
 */

import type { SearchResult, SearchInput, SearchOutput } from './types';

/**
 * Abstract base class for plugins.
 * Extend this class and implement the required methods.
 * 
 * @example
 * ```typescript
 * import { Plugin, SearchResult } from '@launcher/plugin-sdk';
 * 
 * class MyPlugin extends Plugin {
 *   search(query: string): SearchResult[] {
 *     return [{ id: '1', title: 'Hello', subtitle: query }];
 *   }
 * }
 * 
 * export default new MyPlugin();
 * ```
 */
export abstract class Plugin {
  /**
   * Called when the plugin is initialized
   */
  init(): void {
    // Override in subclass if needed
  }

  /**
   * Called when the plugin is being unloaded
   */
  shutdown(): void {
    // Override in subclass if needed
  }

  /**
   * Search for results matching the query
   * @param query - The search query
   * @returns Array of search results
   */
  abstract search(query: string): SearchResult[];

  /**
   * Execute an action by ID
   * @param actionId - The action identifier
   * @param params - Optional parameters
   */
  execute?(actionId: string, params?: Record<string, unknown>): void;
}

/**
 * Helper to create a simple search result
 */
export function createResult(
  id: string,
  title: string,
  options?: Partial<Omit<SearchResult, 'id' | 'title'>>
): SearchResult {
  return { id, title, ...options };
}

/**
 * Helper to create an "open URL" result
 */
export function createUrlResult(
  id: string,
  title: string,
  url: string,
  options?: Partial<Omit<SearchResult, 'id' | 'title' | 'action'>>
): SearchResult {
  return {
    id,
    title,
    action: { type: 'open_url', value: url },
    ...options,
  };
}

/**
 * Helper to create a "copy to clipboard" result
 */
export function createCopyResult(
  id: string,
  title: string,
  textToCopy: string,
  options?: Partial<Omit<SearchResult, 'id' | 'title' | 'action'>>
): SearchResult {
  return {
    id,
    title,
    action: { type: 'copy', value: textToCopy },
    ...options,
  };
}

/**
 * Register the plugin exports for the WASM module.
 * Call this at the end of your plugin file.
 * 
 * @example
 * ```typescript
 * import { Plugin, registerPlugin } from '@launcher/plugin-sdk';
 * 
 * class MyPlugin extends Plugin {
 *   search(query: string) {
 *     return [{ id: '1', title: query }];
 *   }
 * }
 * 
 * registerPlugin(new MyPlugin());
 * ```
 */
export function registerPlugin(plugin: Plugin): void {
  // This function sets up the WASM exports
  // The actual implementation depends on the Extism JS PDK
  
  // For Extism JS PDK, we need to export functions that the host can call
  // These are typically done via the module's exports
  
  // Store plugin instance globally for the exported functions
  (globalThis as any).__launcherPlugin = plugin;
}

// Export functions that will be called by the host
// These are the WASM module exports

/**
 * Initialize the plugin
 */
export function init(): void {
  const plugin = (globalThis as any).__launcherPlugin as Plugin | undefined;
  if (plugin) {
    plugin.init();
  }
}

/**
 * Search function called by the host
 */
export function search(): string {
  const plugin = (globalThis as any).__launcherPlugin as Plugin | undefined;
  if (!plugin) {
    return JSON.stringify({ results: [] });
  }

  // Get input from host
  // @ts-ignore - Extism PDK global
  const inputJson = Host.inputString();
  const input: SearchInput = JSON.parse(inputJson);

  // Call plugin's search method
  const results = plugin.search(input.query);

  // Return output
  const output: SearchOutput = { results };
  return JSON.stringify(output);
}

/**
 * Shutdown the plugin
 */
export function shutdown(): void {
  const plugin = (globalThis as any).__launcherPlugin as Plugin | undefined;
  if (plugin) {
    plugin.shutdown();
  }
}


