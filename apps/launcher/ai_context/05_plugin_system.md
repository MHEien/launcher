# Plugin System Architecture

## Overview
The plugin system is a core differentiator—enabling community extensions while maintaining security and cross-platform compatibility.

## Plugin Types

### 1. Search Providers
Add new searchable sources:
- **Examples:** Bookmarks, browser history, Notion pages, GitHub repos, Spotify tracks
- **Interface:** Implement `SearchProvider` trait
- **Behavior:** Results appear in main search alongside core providers

### 2. Actions
Add executable commands:
- **Examples:** "Create Jira ticket", "Start Pomodoro timer", "Toggle VPN"
- **Interface:** Implement `Action` trait
- **Behavior:** Appear as actionable results, may have sub-menus

### 3. Views (Advanced)
Custom UI panels:
- **Examples:** Calendar widget, clipboard history, snippet manager
- **Interface:** Provide React component via plugin manifest
- **Behavior:** Opened via command or shortcut, renders in launcher window

### 4. AI Tools (Premium Integration)
Tools the AI agent can invoke:
- **Examples:** "Search my emails", "Create calendar event", "Query database"
- **Interface:** JSON schema defining tool parameters and behavior
- **Behavior:** AI calls tool, plugin executes, returns result to AI

## Plugin Manifest
Every plugin includes a `manifest.json`:
```json
{
  "id": "com.example.github-search",
  "name": "GitHub Search",
  "version": "1.0.0",
  "author": "Developer Name",
  "description": "Search GitHub repos, issues, and PRs",
  "permissions": ["network", "oauth:github"],
  "entry": "plugin.wasm",
  "provides": {
    "providers": ["github-repos", "github-issues"],
    "actions": ["create-issue", "create-pr"],
    "ai_tools": ["search-repos", "get-issue-details"]
  },
  "oauth": {
    "github": {
      "scopes": ["repo", "read:user"]
    }
  }
}
```

## Security Model

### WASM Sandboxing
- Plugins run in WASM sandbox via `wasmtime`
- No direct filesystem/network access—must use provided APIs
- Memory isolated per plugin

### Permission System
| Permission | Description | User Prompt |
|------------|-------------|-------------|
| `network` | Make HTTP requests | "Allow network access?" |
| `filesystem:read` | Read files (scoped paths) | "Allow reading files in X?" |
| `filesystem:write` | Write files (scoped paths) | "Allow writing files in X?" |
| `clipboard` | Read/write clipboard | "Allow clipboard access?" |
| `oauth:<provider>` | OAuth token for provider | OAuth consent screen |
| `notifications` | Show system notifications | "Allow notifications?" |

### Code Signing
- Marketplace plugins are signed
- Unsigned plugins show warning
- Enterprise can enforce signed-only policy

## Plugin APIs

### Host Functions (Rust → WASM)
```rust
// Available to plugins via WASM imports
fn http_request(url: &str, method: &str, body: &[u8]) -> Response;
fn read_file(path: &str) -> Result<Vec<u8>, Error>;
fn write_file(path: &str, data: &[u8]) -> Result<(), Error>;
fn get_oauth_token(provider: &str) -> Result<String, Error>;
fn show_notification(title: &str, body: &str);
fn log(level: LogLevel, message: &str);
fn get_config() -> PluginConfig;
fn set_config(config: PluginConfig);
```

### Plugin Exports (WASM → Rust)
```rust
// Plugins must export these
fn init() -> PluginInfo;
fn search(query: &str) -> Vec<SearchResult>;
fn execute(action_id: &str, params: &str) -> Result<(), Error>;
fn shutdown();
```

## Marketplace Integration

### Publishing Flow
1. Developer creates plugin, tests locally
2. Submit to marketplace (requires developer account)
3. Automated security scan + review
4. Published to marketplace with version history

### Installation Flow
1. User browses marketplace in launcher
2. Clicks "Install" → sees permission prompt
3. Plugin downloaded, verified, installed
4. Appears in settings, can be configured/disabled

### Update Flow
1. Launcher checks for updates on startup (configurable)
2. User notified of available updates
3. One-click update or auto-update (user preference)

## Local Development
```bash
# Create new plugin from template
launcher plugin new my-plugin

# Build plugin
launcher plugin build

# Test locally (sideload)
launcher plugin dev

# Package for submission
launcher plugin package
```

## Configuration & Storage
- Each plugin gets isolated storage directory
- Config stored as JSON, accessible via API
- Secrets (API keys) stored in OS keychain via host API

## Example: GitHub Plugin

### Search Provider
```rust
fn search(query: &str) -> Vec<SearchResult> {
    let token = get_oauth_token("github")?;
    let repos = github_api::search_repos(&token, query)?;
    
    repos.iter().map(|r| SearchResult {
        id: r.full_name.clone(),
        title: r.name.clone(),
        subtitle: r.description.clone(),
        icon: Icon::Url(r.owner.avatar_url.clone()),
        action: Action::OpenUrl(r.html_url.clone()),
    }).collect()
}
```

### AI Tool
```json
{
  "name": "search_github_repos",
  "description": "Search GitHub repositories",
  "parameters": {
    "query": { "type": "string", "description": "Search query" },
    "language": { "type": "string", "optional": true }
  }
}
```
