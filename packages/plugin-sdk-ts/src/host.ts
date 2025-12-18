/**
 * Host functions - these are provided by the Launcher runtime
 * and allow plugins to interact with the host system.
 * 
 * When building with @extism/js-pdk, these functions communicate
 * with the host via WASM imports.
 */

import type { HttpRequest, HttpResponse, PluginConfig, LogLevel } from './types';

// Declare the Extism host functions
declare const Host: {
  inputString(): string;
  outputString(s: string): void;
  getFunctions(): {
    host_log?: (level: string, message: string) => void;
    host_http_request?: (requestJson: string) => string;
    host_get_config?: () => string;
    host_set_config?: (configJson: string) => void;
    host_show_notification?: (title: string, body: string) => void;
    host_get_oauth_token?: (provider: string) => string;
  };
};

/**
 * Log a message to the host console
 */
export function log(level: LogLevel, message: string): void {
  try {
    const fns = Host.getFunctions();
    if (fns.host_log) {
      fns.host_log(level, message);
    }
  } catch {
    // Fallback for testing outside WASM
    console.log(`[${level.toUpperCase()}] ${message}`);
  }
}

/**
 * Log convenience functions
 */
export const logger = {
  debug: (message: string) => log('debug', message),
  info: (message: string) => log('info', message),
  warn: (message: string) => log('warn', message),
  error: (message: string) => log('error', message),
};

/**
 * Make an HTTP request
 * @requires network permission
 */
export function httpRequest(request: HttpRequest): HttpResponse {
  try {
    const fns = Host.getFunctions();
    if (fns.host_http_request) {
      const responseJson = fns.host_http_request(JSON.stringify(request));
      return JSON.parse(responseJson);
    }
    throw new Error('HTTP requests not available');
  } catch (e) {
    throw new Error(`HTTP request failed: ${e}`);
  }
}

/**
 * Convenience functions for common HTTP methods
 */
export const http = {
  get: (url: string, headers?: Record<string, string>): HttpResponse =>
    httpRequest({ url, method: 'GET', headers }),
  
  post: (url: string, body?: string, headers?: Record<string, string>): HttpResponse =>
    httpRequest({ url, method: 'POST', body, headers }),
  
  put: (url: string, body?: string, headers?: Record<string, string>): HttpResponse =>
    httpRequest({ url, method: 'PUT', body, headers }),
  
  delete: (url: string, headers?: Record<string, string>): HttpResponse =>
    httpRequest({ url, method: 'DELETE', headers }),
};

/**
 * Get the plugin's configuration
 */
export function getConfig(): PluginConfig {
  try {
    const fns = Host.getFunctions();
    if (fns.host_get_config) {
      const configJson = fns.host_get_config();
      return JSON.parse(configJson);
    }
    return { values: {} };
  } catch {
    return { values: {} };
  }
}

/**
 * Set the plugin's configuration
 */
export function setConfig(config: PluginConfig): void {
  try {
    const fns = Host.getFunctions();
    if (fns.host_set_config) {
      fns.host_set_config(JSON.stringify(config));
    }
  } catch (e) {
    throw new Error(`Failed to set config: ${e}`);
  }
}

/**
 * Show a system notification
 * @requires notifications permission
 */
export function showNotification(title: string, body: string): void {
  try {
    const fns = Host.getFunctions();
    if (fns.host_show_notification) {
      fns.host_show_notification(title, body);
    }
  } catch (e) {
    throw new Error(`Failed to show notification: ${e}`);
  }
}

/**
 * Get an OAuth token for a provider
 * @requires oauth:provider permission
 */
export function getOAuthToken(provider: string): string {
  try {
    const fns = Host.getFunctions();
    if (fns.host_get_oauth_token) {
      return fns.host_get_oauth_token(provider);
    }
    throw new Error('OAuth not available');
  } catch (e) {
    throw new Error(`Failed to get OAuth token: ${e}`);
  }
}


