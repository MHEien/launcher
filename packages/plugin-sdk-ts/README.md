# @launcher/plugin-sdk

SDK for building Launcher plugins in TypeScript.

## Installation

```bash
npm install @launcher/plugin-sdk
npm install -D @extism/js-pdk
```

## Quick Start

Create a new plugin:

```typescript
// plugin.ts
import { 
  Plugin, 
  SearchResult, 
  registerPlugin,
  logger,
  createUrlResult 
} from '@launcher/plugin-sdk';

class MyPlugin extends Plugin {
  init() {
    logger.info('MyPlugin initialized!');
  }

  search(query: string): SearchResult[] {
    if (!query) return [];
    
    return [
      createUrlResult(
        'google-search',
        `Search Google for "${query}"`,
        `https://google.com/search?q=${encodeURIComponent(query)}`,
        { icon: '🔍', subtitle: 'Opens in browser' }
      ),
    ];
  }
}

registerPlugin(new MyPlugin());
```

## Building

Build your plugin to WebAssembly:

```bash
npx @extism/js-pdk plugin.ts -o plugin.wasm
```

## Plugin Structure

A plugin package should have this structure:

```
my-plugin/
├── manifest.json     # Plugin metadata
├── plugin.ts         # Plugin source
├── plugin.wasm       # Compiled WASM (generated)
└── package.json      # Dependencies
```

### manifest.json

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "A sample plugin",
  "permissions": ["network"],
  "entry": "plugin.wasm",
  "provides": {
    "providers": ["my-search"]
  }
}
```

## API Reference

### Plugin Class

```typescript
abstract class Plugin {
  // Called when plugin loads
  init(): void;
  
  // Called when plugin unloads  
  shutdown(): void;
  
  // Search handler - must implement
  abstract search(query: string): SearchResult[];
  
  // Optional action handler
  execute?(actionId: string, params?: Record<string, unknown>): void;
}
```

### Search Result

```typescript
interface SearchResult {
  id: string;           // Unique identifier
  title: string;        // Main display text
  subtitle?: string;    // Secondary text
  icon?: string;        // Emoji or icon URL
  score?: number;       // Relevance score
  category?: string;    // Result category
  action?: PluginAction; // Action on select
}
```

### Host Functions

```typescript
// Logging
logger.info('message');
logger.warn('message');
logger.error('message');

// HTTP requests (requires 'network' permission)
const response = http.get('https://api.example.com/data');
const data = JSON.parse(response.body);

// Configuration
const config = getConfig();
setConfig({ values: { apiKey: 'xxx' } });

// Notifications (requires 'notifications' permission)
showNotification('Title', 'Body');

// OAuth (requires 'oauth:provider' permission)
const token = getOAuthToken('github');
```

## Permissions

| Permission | Description |
|------------|-------------|
| `network` | Make HTTP requests |
| `filesystem:read` | Read files |
| `filesystem:write` | Write files |
| `clipboard` | Access clipboard |
| `notifications` | Show notifications |
| `oauth:provider` | OAuth for provider |

## Examples

### GitHub Repository Search

```typescript
import { Plugin, SearchResult, registerPlugin, http, getOAuthToken, createUrlResult } from '@launcher/plugin-sdk';

class GitHubPlugin extends Plugin {
  search(query: string): SearchResult[] {
    if (!query || query.length < 2) return [];
    
    const token = getOAuthToken('github');
    const response = http.get(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}`,
      { Authorization: `Bearer ${token}` }
    );
    
    const data = JSON.parse(response.body);
    return data.items.slice(0, 10).map((repo: any) => 
      createUrlResult(
        `repo-${repo.id}`,
        repo.full_name,
        repo.html_url,
        {
          subtitle: repo.description || 'No description',
          icon: '📦',
        }
      )
    );
  }
}

registerPlugin(new GitHubPlugin());
```

## Development

Use the Launcher CLI for development:

```bash
# Create new plugin
launcher-plugin new my-plugin --lang ts

# Build plugin
launcher-plugin build

# Install for testing
launcher-plugin dev

# Package for distribution
launcher-plugin package
```


