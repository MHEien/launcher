# Launcher Development Progress

## Current Phase: Phase 4 - OAuth & SaaS Integrations COMPLETE ✅

### Session Log

#### Session 1 - Dec 17, 2025
**Status:** Phase 1 Core Implementation COMPLETE ✅

**Completed:**
- [x] Project documentation review
- [x] Frontend dependencies setup (Tailwind v4, Zustand, Framer Motion, Lucide)
- [x] Tauri window configuration (transparent, borderless, always-on-top)
- [x] Global hotkey registration (Alt+Space)
- [x] Window toggle show/hide
- [x] Theme engine (Linux GTK/KDE detection)
- [x] Search UI with keyboard navigation
- [x] Calculator provider with instant math evaluation
- [x] App provider (Linux .desktop file discovery)

#### Session 2 - Dec 17, 2025
**Status:** Phase 2 File Indexer COMPLETE ✅

**Completed:**
- [x] Tantivy full-text search integration
- [x] Background file indexing (indexes ~40k files on startup)
- [x] Fuzzy search with skim matcher
- [x] FileProvider integrated with search system
- [x] Indexing status events (Rust → React via Tauri events)
- [x] UI shows indexing progress spinner
- [x] File type icons (emoji-based by extension)
- [x] File execution (xdg-open on Linux)

**How to Test:**
1. Run `bun tauri dev` in project root
2. Press `Alt+Space` to toggle launcher
3. Wait for "Indexing files..." to complete (~2-5 seconds)
4. Type filenames to search indexed files
5. Files from ~/Documents, ~/Downloads, ~/Desktop, ~/Projects, ~/Development are indexed

**Index Configuration:**
- Excludes: node_modules, .git, target, venv, __pycache__, etc.
- Content indexing for: .txt, .md, .rs, .py, .js, .ts, .json, .yaml, etc.
- Max file size: 10MB

**Completed (continued):**
- [x] Filesystem watcher for real-time incremental updates
- [x] Frecency boosting (tracks usage, boosts frequently used results)
- [x] Phase 3: Plugin Foundation started
  - wasmtime WASM runtime integration
  - Plugin manifest format (JSON)
  - Plugin loader (scans plugins directory)
  - Plugin runtime (WASM instantiation, host functions)
  - Host API (logging, file I/O, config, notifications)

**New Files (Phase 3):**
- `src-tauri/src/plugins/mod.rs` - Plugin module exports
- `src-tauri/src/plugins/manifest.rs` - PluginManifest, permissions
- `src-tauri/src/plugins/loader.rs` - PluginLoader for scanning/loading
- `src-tauri/src/plugins/runtime.rs` - WASM runtime with wasmtime
- `src-tauri/src/plugins/host_api.rs` - Host functions for plugins
- `src-tauri/src/frecency.rs` - Frecency tracking for search results

#### Session 3 - Dec 17, 2025
**Status:** Phase 3 Plugin System Integration COMPLETE ✅

**Completed:**
- [x] Integrated plugin system with main app (`lib.rs`)
  - Added `plugins` module import
  - Added `PluginLoader` and `PluginRuntime` to `AppState`
  - Plugin scanning and loading on startup
- [x] Added Tauri commands for plugin management:
  - `list_plugins` - List all loaded plugins
  - `enable_plugin` - Enable and load a plugin
  - `disable_plugin` - Disable and unload a plugin
  - `get_plugins_dir` - Get plugins directory path
- [x] Created example WASM plugin (`examples/hello-plugin/`)
  - `#![no_std]` Rust plugin compiling to wasm32-unknown-unknown
  - Exports: `init`, `shutdown`, `search`, `alloc`
  - Uses `host_log` host function for logging
  - Build scripts: `build.sh`, `install.sh`
- [x] Verified plugin loads and initializes correctly:
  - "Found 1 plugins"
  - "[Plugin:hello-plugin] [info] Hello Plugin initialized!"
  - "Loaded plugin: hello-plugin"

**Plugin Directory:**
- `~/.local/share/launcher/plugins/` - Plugins are installed here
- Each plugin is a folder with `manifest.json` + `*.wasm`

#### Session 4 - Dec 17, 2025
**Status:** Plugin Provider + Settings UI COMPLETE ✅

**Completed:**
- [x] Created `PluginProvider` (`src-tauri/src/providers/plugins.rs`)
  - Integrates plugin search results into main search system
  - Queries all loaded plugins via `call_search`
  - Converts plugin results to `SearchResult` format
- [x] Added `loaded_plugin_ids()` method to `PluginRuntime`
- [x] Added Tauri commands for index configuration:
  - `get_index_config` - Get current index settings
  - `set_index_config` - Update index settings
- [x] Created Settings UI (`src/components/Settings.tsx`)
  - Modal with tabs: File Index, Plugins
  - Shows indexed directories, exclude patterns, content extensions
  - Lists installed plugins with metadata
- [x] Integrated Settings button into Launcher footer
- [x] Added TypeScript types: `IndexConfig`, `PluginManifest`

**New Files:**
- `src-tauri/src/providers/plugins.rs` - Plugin search provider
- `src/components/Settings.tsx` - Settings modal UI

**How to Test:**
1. Run `cargo run` in `src-tauri/`
2. Press `Alt+Space` to toggle launcher
3. Click the gear icon (⚙️) in the footer to open Settings
4. View File Index tab for indexing configuration
5. View Plugins tab for installed plugins

#### Session 5 - Dec 17, 2025
**Status:** Phase 4 OAuth Infrastructure COMPLETE ✅

**Completed:**
- [x] Added OAuth dependencies to Cargo.toml:
  - `keyring` - Secure OS keychain token storage
  - `reqwest` - HTTP client for token exchange
  - `url`, `base64`, `rand`, `sha2` - PKCE support
- [x] Created OAuth module (`src-tauri/src/oauth/`):
  - `providers.rs` - GitHub and Google provider configs
  - `storage.rs` - Secure token storage with keyring + memory cache
  - `flow.rs` - OAuth flow with PKCE, token exchange, refresh
- [x] Added Tauri commands for OAuth:
  - `list_oauth_providers` - List providers with connection status
  - `start_oauth` - Generate auth URL with PKCE
  - `complete_oauth` - Exchange code for tokens
  - `disconnect_oauth` - Remove stored tokens
  - `is_oauth_connected` - Check connection status
- [x] Added Accounts tab to Settings UI:
  - Shows GitHub and Google providers
  - Connect/Disconnect buttons
  - Connection status indicators
- [x] Integrated OAuthFlow into AppState

**New Files:**
- `src-tauri/src/oauth/mod.rs` - OAuth module exports
- `src-tauri/src/oauth/providers.rs` - Provider configs (GitHub, Google)
- `src-tauri/src/oauth/storage.rs` - Keyring-based token storage
- `src-tauri/src/oauth/flow.rs` - PKCE OAuth flow implementation

**How to Test:**
1. Run `cargo run` in `src-tauri/`
2. Press `Alt+Space` to toggle launcher
3. Click ⚙️ gear icon → Accounts tab
4. See GitHub and Google providers listed
5. (OAuth requires client credentials to fully test)

**OAuth Features:**
- PKCE (Proof Key for Code Exchange) for security
- Secure token storage in OS keychain
- Automatic token refresh when expired
- Memory cache for fast token access

#### Session 6 - Dec 17, 2025
**Status:** OAuth Callback Server & Credentials UI COMPLETE ✅

**Completed:**
- [x] Created OAuth callback server (`src-tauri/src/oauth/callback.rs`)
  - Axum-based HTTP server on `localhost:19284`
  - Handles `/oauth/callback` redirect with code/state params
  - Beautiful success/error HTML pages with auto-close
  - Graceful shutdown support
- [x] Integrated callback server with main app
  - Starts automatically on app launch via `tauri::async_runtime::spawn`
  - Shares `OAuthFlow` for token exchange
- [x] Added client credentials configuration to Settings UI
  - Expandable provider cards with credential inputs
  - Client ID and Client Secret fields
  - Save button with loading state
  - "Get credentials" link to provider dev consoles
  - Shows redirect URI for easy copy
  - Status indicators: "Credentials required" / "Ready to connect" / "Connected"
- [x] Added Tauri commands for credentials management:
  - `get_oauth_credentials` - Get current credentials for a provider
  - `set_oauth_credentials` - Update credentials for a provider
- [x] Added `update_provider_credentials` method to `OAuthFlow`

**New Files:**
- `src-tauri/src/oauth/callback.rs` - OAuth callback HTTP server

**Dependencies Added:**
- `axum = "0.7"` - HTTP server for callback handling
- `tower = "0.5"` - Middleware support

**How to Test OAuth:**
1. Run `bun tauri dev`
2. Press `Alt+Space` → Click ⚙️ gear → Accounts tab
3. Click chevron to expand GitHub/Google provider
4. Enter Client ID (and optionally Client Secret)
5. Click "Save" → Click "Connect"
6. Complete OAuth in browser → Redirects to callback server
7. Token stored securely in OS keychain

#### Session 7 - Dec 17, 2025
**Status:** GitHub Search Provider COMPLETE ✅

**Completed:**
- [x] Created native GitHub search provider (`src-tauri/src/providers/github.rs`)
  - Searches GitHub repositories via API
  - Uses OAuth token from connected GitHub account
  - Triggered with `gh ` prefix (e.g., "gh tauri")
  - Caches results for 60 seconds
  - Shows "Connect GitHub" prompt if not authenticated
- [x] Added `get_token_if_valid` method to `OAuthFlow` for sync token access
- [x] Added `GitHub` category to `ResultCategory` enum
- [x] Integrated GitHub provider into main app
- [x] Added `blocking` feature to reqwest for sync HTTP requests

**New Files:**
- `src-tauri/src/providers/github.rs` - GitHub repository search provider

**How to Test GitHub Search:**
1. Run `bun tauri dev`
2. Press `Alt+Space` → Settings → Accounts → GitHub
3. Enter Client ID from GitHub OAuth App
4. Click Save → Connect → Authorize in browser
5. Type `gh tauri` to search GitHub repos
6. Press Enter to open repo in browser

**GitHub Search Features:**
- Prefix-triggered: Only searches when query starts with "gh "
- Shows repo name, description, stars, language
- Opens repo URL in browser on selection
- 60-second result caching
- Graceful handling when not connected

#### Session 8 - Dec 17, 2025
**Status:** Editable Settings & Plugin Toggle COMPLETE ✅

**Completed:**
- [x] Made Index Settings fully editable:
  - Add/remove indexed directories with input field
  - Add/remove exclude patterns (tags with X button)
  - Add/remove content-indexed extensions
  - Toggle exclude_hidden and index_content options
  - Save Changes button to persist config
  - Reindex button to trigger re-indexing
- [x] Added plugin enable/disable toggle:
  - Created `PluginInfo` struct with `enabled` field
  - Toggle button shows Enabled/Disabled state
  - Calls `enable_plugin`/`disable_plugin` Tauri commands
  - Visual feedback: disabled plugins appear dimmed
- [x] Updated types:
  - Rust: `PluginInfo` in `loader.rs` with enabled status
  - TypeScript: `PluginInfo` interface with enabled field

**UI Improvements:**
- Hover-to-reveal delete buttons on list items
- Enter key support for adding items
- Loading spinners during save/toggle operations
- Visual distinction between enabled/disabled plugins

#### Session 9 - Dec 17, 2025
**Status:** Index Config Persistence COMPLETE ✅

**Completed:**
- [x] Added config persistence to `IndexConfig`:
  - `load()` - Load config from `~/.local/share/launcher/index_config.json`
  - `save()` - Save config to disk with pretty JSON formatting
  - Falls back to defaults if config file doesn't exist or is invalid
- [x] Updated `FileProvider::initialize()` to use `IndexConfig::load()` instead of `default()`
- [x] Updated `set_index_config` Tauri command to persist changes to disk before updating in-memory state
- [x] Config now survives app restarts

**Modified Files:**
- `src-tauri/src/indexer/config.rs` - Added `load()`, `save()`, `config_path()` methods
- `src-tauri/src/providers/files.rs` - Changed `initialize()` to use `IndexConfig::load()`
- `src-tauri/src/lib.rs` - Updated `set_index_config` to call `config.save()`

**How to Test:**
1. Run `bun tauri dev`
2. Press `Alt+Space` → Settings → File Index tab
3. Add/remove directories, patterns, or extensions
4. Click "Save Changes"
5. Restart the app - settings should persist

**Config Location:**
- `~/.local/share/launcher/index_config.json`

#### Session 10 - Dec 17, 2025
**Status:** Phase 5 Plugin Marketplace COMPLETE ✅

**Completed:**
- [x] Created plugin registry system (`src-tauri/src/plugins/registry.rs`):
  - `RegistryPlugin` struct with metadata (name, version, author, description, categories, downloads, rating)
  - `PluginRegistry` with in-memory cache and disk persistence
  - Featured plugins catalog (Hello Plugin, Clipboard History, Snippets, Emoji Picker, Color Picker)
  - Search, filter by category, load/save cache
- [x] Added Tauri commands for marketplace:
  - `list_marketplace_plugins` - List all available plugins
  - `search_marketplace` - Search plugins by query
  - `get_marketplace_categories` - Get unique categories
  - `get_marketplace_plugin` - Get plugin details by ID
  - `install_plugin` - Download and install plugin (supports local:// and remote URLs)
  - `uninstall_plugin` - Remove installed plugin
- [x] Added `zip` crate for extracting downloaded plugin archives
- [x] Created Marketplace UI tab in Settings:
  - Search bar with Enter key support
  - Category filter buttons (All, Productivity, Utilities, etc.)
  - Plugin cards with name, version, description, author, rating, downloads
  - Install/Uninstall buttons with loading states
  - "Installed" badge for installed plugins
- [x] Added TypeScript types: `RegistryPlugin`

**New Files:**
- `src-tauri/src/plugins/registry.rs` - Plugin registry/catalog system

**Modified Files:**
- `src-tauri/src/plugins/mod.rs` - Export registry module
- `src-tauri/src/lib.rs` - Add registry to AppState, marketplace commands
- `src-tauri/Cargo.toml` - Add `zip` dependency
- `src/types/index.ts` - Add `RegistryPlugin` type
- `src/components/Settings.tsx` - Add Marketplace tab with full UI

**How to Test:**
1. Run `bun tauri dev`
2. Press `Alt+Space` → Settings → Marketplace tab
3. Browse featured plugins with categories
4. Search for plugins by name/description
5. Click "Install" to install a plugin (Hello Plugin works locally)
6. Installed plugins appear in Plugins tab

**Marketplace Features:**
- Search plugins by name/description
- Filter by category
- Shows download count and rating
- One-click install/uninstall
- Local plugin support (local:// URLs for development)
- Remote plugin support (downloads and extracts zip files)

#### Session 11 - Dec 17, 2025
**Status:** Notion & Slack OAuth + Notion Search Provider COMPLETE ✅

**Completed:**
- [x] Added Notion OAuth provider (`src-tauri/src/oauth/providers.rs`):
  - Auth URL: `https://api.notion.com/v1/oauth/authorize`
  - Token URL: `https://api.notion.com/v1/oauth/token`
  - Notion uses integration capabilities instead of scopes
- [x] Added Slack OAuth provider:
  - Auth URL: `https://slack.com/oauth/v2/authorize`
  - Token URL: `https://slack.com/api/oauth.v2.access`
  - Scopes: `channels:read`, `search:read`, `users:read`
- [x] Created Notion search provider (`src-tauri/src/providers/notion.rs`):
  - Triggered with `nt ` prefix (e.g., "nt meeting notes")
  - Searches Notion pages via API
  - Shows page title, emoji icon, and "Notion Page" subtitle
  - Opens page in browser on selection
  - 60-second result caching
- [x] Updated Settings UI with Notion/Slack icons and developer console links:
  - Notion: 📝 → https://www.notion.so/my-integrations
  - Slack: 💬 → https://api.slack.com/apps
- [x] Registered all 4 OAuth providers (GitHub, Google, Notion, Slack)

**New Files:**
- `src-tauri/src/providers/notion.rs` - Notion search provider

**Modified Files:**
- `src-tauri/src/oauth/providers.rs` - Added NotionProvider, SlackProvider
- `src-tauri/src/providers/mod.rs` - Export notion module
- `src-tauri/src/lib.rs` - Register OAuth providers, add NotionProvider to search
- `src/components/Settings.tsx` - Add Notion/Slack icons and docs links

**How to Test Notion Search:**
1. Run `bun tauri dev`
2. Press `Alt+Space` → Settings → Accounts → Notion
3. Create integration at https://www.notion.so/my-integrations
4. Enter Client ID and Client Secret → Save → Connect
5. Type `nt meeting` to search Notion pages
6. Press Enter to open page in browser

**Search Prefixes:**
- `gh <query>` - Search GitHub repositories
- `nt <query>` - Search Notion pages

#### Session 12 - Dec 17, 2025
**Status:** Slack Search Provider COMPLETE ✅

**Completed:**
- [x] Created Slack search provider (`src-tauri/src/providers/slack.rs`):
  - Triggered with `sl ` prefix (e.g., "sl project update")
  - Searches Slack messages via `search.messages` API
  - Shows message text, channel name, and username
  - Opens message permalink in browser on selection
  - 60-second result caching
  - Truncates long messages to 60 chars

**New Files:**
- `src-tauri/src/providers/slack.rs` - Slack search provider

**Modified Files:**
- `src-tauri/src/providers/mod.rs` - Export slack module
- `src-tauri/src/lib.rs` - Add SlackProvider to search providers

**How to Test Slack Search:**
1. Run `bun tauri dev`
2. Press `Alt+Space` → Settings → Accounts → Slack
3. Create app at https://api.slack.com/apps with `search:read` scope
4. Enter Client ID and Client Secret → Save → Connect
5. Type `sl meeting` to search Slack messages
6. Press Enter to open message in Slack

**All Search Prefixes:**
- `gh <query>` - Search GitHub repositories
- `nt <query>` - Search Notion pages
- `sl <query>` - Search Slack messages

#### Session 13 - Dec 17, 2025
**Status:** Plugin Update Checking COMPLETE ✅

**Completed:**
- [x] Added `check_plugin_updates` Tauri command:
  - Compares installed plugin versions with registry versions
  - Returns list of plugins with available updates
- [x] Added `update_plugin` Tauri command:
  - Uninstalls current version
  - Downloads and installs latest from registry
  - Supports both local:// and remote URLs
- [x] Added `PluginUpdate` type (Rust + TypeScript)
- [x] Updated Plugins tab UI:
  - Shows yellow "Update: vX.X.X" badge when update available
  - "Update" button with loading state
  - Automatically checks for updates when tab opens

**Modified Files:**
- `src-tauri/src/lib.rs` - Added check_plugin_updates, update_plugin commands
- `src/types/index.ts` - Added PluginUpdate interface
- `src/components/Settings.tsx` - Added update checking UI to Plugins tab

**How to Test:**
1. Run `bun tauri dev`
2. Install a plugin from Marketplace
3. Go to Plugins tab - see current version
4. If registry has newer version, yellow badge appears
5. Click "Update" to update to latest version

#### Session 14 - Dec 17, 2025
**Status:** Google Drive Search Provider COMPLETE ✅

**Completed:**
- [x] Created Google Drive search provider (`src-tauri/src/providers/google_drive.rs`):
  - Triggered with `gd ` prefix (e.g., "gd budget report")
  - Searches files in Google Drive via API
  - Shows file name, type (Google Doc/Sheet/Slides/PDF/etc.), and owner
  - File type icons: 📄 Doc, 📊 Sheet, 📽️ Slides, 📁 Folder, 📕 PDF, 🖼️ Image, 🎬 Video
  - Opens file in browser on selection
  - 60-second result caching
  - Orders by most recently modified

**New Files:**
- `src-tauri/src/providers/google_drive.rs` - Google Drive search provider

**Modified Files:**
- `src-tauri/src/providers/mod.rs` - Export google_drive module
- `src-tauri/src/lib.rs` - Add GoogleDriveProvider to search providers

**How to Test:**
1. Run `bun tauri dev`
2. Press `Alt+Space` → Settings → Accounts → Google
3. Create OAuth app at https://console.cloud.google.com/apis/credentials
4. Enable Google Drive API, add `drive.readonly` scope
5. Enter Client ID and Client Secret → Save → Connect
6. Type `gd meeting notes` to search Drive files
7. Press Enter to open file in browser

**All Search Prefixes:**
- `gh <query>` - Search GitHub repositories
- `nt <query>` - Search Notion pages
- `sl <query>` - Search Slack messages
- `gd <query>` - Search Google Drive files

#### Session 15 - Dec 17, 2025
**Status:** Google Calendar Search Provider COMPLETE ✅

**Completed:**
- [x] Created Google Calendar search provider (`src-tauri/src/providers/google_calendar.rs`):
  - Triggered with `gc ` prefix (e.g., "gc standup")
  - Searches upcoming events (next 30 days) via Calendar API
  - Shows event title, date/time, and location
  - Formats time nicely: "Dec 17, 14:30" or "2025-01-15 (All day)"
  - Opens event in Google Calendar on selection
  - 60-second result caching
  - Orders by start time

**New Files:**
- `src-tauri/src/providers/google_calendar.rs` - Google Calendar search provider

**Modified Files:**
- `src-tauri/src/providers/mod.rs` - Export google_calendar module
- `src-tauri/src/lib.rs` - Add GoogleCalendarProvider to search providers

**How to Test:**
1. Run `bun tauri dev`
2. Press `Alt+Space` → Settings → Accounts → Google
3. Enable Google Calendar API, add `calendar.readonly` scope
4. Connect Google account
5. Type `gc meeting` to search upcoming events
6. Press Enter to open event in Google Calendar

**All Search Prefixes:**
- `gh <query>` - Search GitHub repositories
- `nt <query>` - Search Notion pages
- `sl <query>` - Search Slack messages
- `gd <query>` - Search Google Drive files
- `gc <query>` - Search Google Calendar events

#### Session 16 - Dec 17, 2025
**Status:** Expanded Plugin Marketplace Catalog ✅

**Completed:**
- [x] Added 9 new plugin entries to marketplace registry:
  - **Linear** - Search/create issues, view assigned tasks
  - **Jira** - Search issues, view sprint boards, create tickets
  - **Todoist** - Manage tasks, add/complete/search to-dos
  - **Things 3** - Quick add tasks (macOS only)
  - **1Password** - Search and copy passwords (requires CLI)
  - **Bitwarden** - Search and copy passwords from vault
  - **Spotify** - Control playback, search tracks/albums
  - **Docker** - Manage containers, start/stop/logs
  - **SSH Connections** - Quick connect from ~/.ssh/config

**Modified Files:**
- `src-tauri/src/plugins/registry.rs` - Added 9 plugin entries with categories, permissions, ratings

**Marketplace Now Has 14 Plugins:**
| Plugin | Category | Downloads | Rating |
|--------|----------|-----------|--------|
| Spotify | Media | 6,200 | 4.7 |
| 1Password | Security | 5,600 | 4.9 |
| Jira | Project Management | 4,500 | 4.3 |
| Bitwarden | Security | 3,400 | 4.5 |
| Linear | Project Management | 3,200 | 4.7 |
| Todoist | Tasks | 2,800 | 4.6 |
| Emoji Picker | Utilities | 2,100 | 4.8 |
| Docker | DevOps | 2,100 | 4.4 |
| SSH | DevOps | 1,800 | 4.3 |
| Color Picker | Design | 1,560 | 4.6 |
| Clipboard History | Productivity | 1,250 | 4.5 |
| Things 3 | Tasks | 1,200 | 4.8 |
| Snippets | Text | 890 | 4.2 |
| Hello Plugin | Examples | 0 | - |

**New Categories:**
- Project Management, Tasks, Security, Media, Music, DevOps

#### Session 17 - Dec 17, 2025
**Status:** Monorepo Restructure COMPLETE ✅

**Completed:**
- [x] Restructured project into monorepo:
  ```
  launcher/
  ├── apps/
  │   └── launcher/     # Desktop app (moved here)
  ├── packages/         # Shared packages (future)
  ├── package.json      # Workspace root
  ├── turbo.json        # Turborepo config
  └── README.md         # Monorepo docs
  ```
- [x] Renamed package to `@launcher/desktop`
- [x] Added Turborepo for task orchestration
- [x] Updated .gitignore for monorepo

**New Root Files:**
- `package.json` - Bun workspaces config
- `turbo.json` - Turborepo task config
- `README.md` - Monorepo documentation

**Future Apps (placeholders):**
- `apps/web` - Web dashboard for plugin marketplace
- `apps/server` - Plugin registry API server

**Future Packages:**
- `packages/shared` - Shared types and utilities

**How to Run:**
```bash
cd apps/launcher
bun install
bun tauri dev
```

#### Session 18 - Dec 17, 2025
**Status:** Server + Shared Package COMPLETE ✅

**Completed:**
- [x] Created `apps/server` - Plugin Registry API:
  - Hono framework for fast HTTP
  - Endpoints: `/api/plugins`, `/api/plugins/:id`, `/api/categories`, `/api/search`
  - Download tracking endpoint
  - CORS enabled for desktop app
  - Runs on port 3001
- [x] Created `packages/shared` - Shared TypeScript types:
  - `RegistryPlugin`, `PluginUpdate`, `PluginManifest`
  - `OAuthProviderInfo`, `OAuthCredentials`
  - `IndexConfig`, `SearchResult`
  - API response types

**New Files:**
- `apps/server/package.json` - Server package config
- `apps/server/src/index.ts` - Hono API server
- `apps/server/tsconfig.json` - TypeScript config
- `packages/shared/package.json` - Shared package config
- `packages/shared/src/index.ts` - Shared types
- `packages/shared/tsconfig.json` - TypeScript config

**Monorepo Structure:**
```
launcher/
├── apps/
│   ├── launcher/     # Desktop app (Tauri + React)
│   └── server/       # Plugin registry API (Hono)
├── packages/
│   └── shared/       # Shared TypeScript types
├── package.json      # Workspace root
├── turbo.json        # Turborepo config
└── README.md
```

**How to Run Server:**
```bash
cd apps/server
bun install
bun run dev
# API at http://localhost:3001
```

**API Endpoints:**
- `GET /api/plugins` - List all plugins
- `GET /api/plugins/:id` - Get plugin by ID
- `GET /api/categories` - List categories
- `GET /api/search?q=query` - Search plugins
- `POST /api/plugins/:id/download` - Track download

#### Session 19 - Dec 17, 2025
**Status:** Desktop ↔ Server API Integration COMPLETE ✅

**Completed:**
- [x] Added `refresh_marketplace` Tauri command:
  - Fetches plugins from `http://localhost:3001/api/plugins`
  - Updates local registry with server data
  - Saves to local cache
- [x] Added refresh button to Marketplace UI:
  - RefreshCw icon button next to search
  - Loading spinner while refreshing
  - Fetches latest plugins from server

**Modified Files:**
- `apps/launcher/src-tauri/src/lib.rs` - Added refresh_marketplace command
- `apps/launcher/src/components/Settings.tsx` - Added refresh button to Marketplace

**How to Test:**
1. Start server: `cd apps/server && bun run dev`
2. Start desktop: `cd apps/launcher && bun tauri dev`
3. Open Settings → Marketplace
4. Click refresh button (↻) to fetch from server

#### Session 20 - Dec 17, 2025
**Status:** Web Dashboard COMPLETE ✅

**Completed:**
- [x] Created `apps/web` - Plugin Marketplace Web Dashboard:
  - Next.js 16 with App Router
  - Dark theme with Tailwind CSS
  - Server-side data fetching from API
  - Responsive grid layout
- [x] Components:
  - `PluginGrid` - Grid of plugin cards with ratings, downloads, categories
  - `SearchBar` - Search input with navigation
  - `CategoryFilter` - Category filter buttons
- [x] Pages:
  - `/` - Homepage with all plugins
  - `/search?q=query` - Search results page

**New Files:**
- `apps/web/src/app/page.tsx` - Homepage
- `apps/web/src/app/search/page.tsx` - Search results
- `apps/web/src/components/plugin-grid.tsx` - Plugin cards
- `apps/web/src/components/search-bar.tsx` - Search input
- `apps/web/src/components/category-filter.tsx` - Category buttons

**Final Monorepo Structure:**
```
launcher/
├── apps/
│   ├── launcher/     # Desktop app (Tauri + React)
│   ├── server/       # Plugin registry API (Hono)
│   └── web/          # Web dashboard (Next.js)
├── packages/
│   └── shared/       # Shared TypeScript types
├── package.json      # Workspace root
├── turbo.json        # Turborepo config
└── README.md
```

**How to Run Everything:**
```bash
# Terminal 1: API Server
cd apps/server && bun run dev

# Terminal 2: Web Dashboard
cd apps/web && bun run dev

# Terminal 3: Desktop App
cd apps/launcher && bun tauri dev
```

**URLs:**
- Desktop: Alt+Space hotkey
- Server API: http://localhost:3001
- Web Dashboard: http://localhost:3000

#### Session 21 - Dec 17, 2025
**Status:** Plugin Detail Page + Neon Auth Integration COMPLETE ✅

**Completed:**
- [x] Created plugin detail page (`apps/web/src/app/plugins/[id]/page.tsx`):
  - Dynamic routing for individual plugins
  - Shows full description, categories, permissions
  - Installation instructions with CLI command
  - Links to homepage and repository
- [x] Expanded server plugin registry with more detailed data
- [x] Created shared packages for monorepo scalability:
  - `packages/db` - Drizzle ORM schema and Neon Postgres client
  - `packages/cache` - Upstash Redis and Vector clients
- [x] Integrated Neon Auth (Stack Auth) for user authentication:
  - `@stackframe/stack` SDK
  - OAuth with Google and GitHub
  - Server and client app separation (`stack.ts`, `stack-client.ts`)
  - Auth handler at `/handler/[...stack]`
  - `StackProvider` wrapper in layout
- [x] Created user dashboard page (`/dashboard`):
  - Usage stats (AI queries, plugins, subscription tier)
  - Quick actions (browse plugins, settings, API keys)
  - Protected route with auth redirect
- [x] Added Header component with user navigation:
  - Sign In button when logged out
  - UserButton dropdown when logged in
  - Dashboard link for authenticated users

**New Files:**
- `apps/web/src/app/plugins/[id]/page.tsx` - Plugin detail page
- `apps/web/src/app/dashboard/page.tsx` - User dashboard
- `apps/web/src/app/handler/[...stack]/page.tsx` - Stack Auth handler
- `apps/web/src/stack.ts` - Server-side Stack Auth app
- `apps/web/src/stack-client.ts` - Client-side Stack Auth app
- `apps/web/src/components/header.tsx` - Header with auth
- `apps/web/src/components/auth-provider.tsx` - StackProvider wrapper
- `apps/web/src/lib/auth/client.ts` - Auth hooks export
- `packages/db/src/schema.ts` - Drizzle ORM schema (users, subscriptions, usage, plugins)
- `packages/db/src/index.ts` - Neon Postgres client
- `packages/cache/src/redis.ts` - Upstash Redis client
- `packages/cache/src/vector.ts` - Upstash Vector client

**Database Schema (packages/db):**
- `neon_auth.users_sync` - Reference to Neon Auth users
- `user_profiles` - App-specific user settings
- `subscriptions` - Subscription tiers (free/pro/team/enterprise)
- `usage_records` - AI query and action tracking
- `usage_aggregates` - Monthly usage summaries
- `plugins` - Marketplace plugins
- `user_plugins` - Installed plugins per user
- `plugin_ratings` - User ratings/reviews
- `api_keys` - Desktop app sync keys

**Environment Variables (apps/web/.env):**
```bash
# Neon Auth (Stack Auth)
NEXT_PUBLIC_STACK_PROJECT_ID=xxx
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_xxx
STACK_SECRET_SERVER_KEY=ssk_xxx

# Database
DATABASE_URL=postgresql://...

# Upstash Redis/Vector (optional)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

**Auth Routes:**
- `/handler/sign-in` - Sign in page
- `/handler/sign-up` - Sign up page
- `/handler/sign-out` - Sign out
- `/dashboard` - Protected user dashboard

**How to Test Auth:**
1. Start server: `cd apps/server && bun run dev`
2. Start web: `cd apps/web && bun run dev`
3. Click "Sign In" in header
4. Sign in with Google or GitHub
5. Redirected to dashboard after auth

**Next Session:**
- [x] Stripe subscription integration ✅
- [x] Plugin submission form ✅
- [x] Usage tracking implementation ✅
- [x] API key generation for desktop sync ✅

---

#### Session 22 - Dec 17, 2025
**Status:** Stripe Integration + Plugin Submission + Usage Tracking COMPLETE ✅

**Completed:**
- [x] **Stripe Subscription Integration:**
  - Added `stripe` package to web app
  - Created `/pricing` page with tier cards (Free/Pro/Team/Enterprise)
  - Monthly/yearly billing toggle with 17% yearly discount
  - Checkout API route (`/api/stripe/checkout`) creates Stripe sessions
  - Webhook handler (`/api/stripe/webhook`) processes subscription events
  - Customer portal route (`/api/stripe/portal`) for billing management
  - Subscription management page (`/dashboard/subscription`)

- [x] **Plugin Submission Form:**
  - Created `/plugins/submit` page for developers
  - Form fields: name, ID, version, description, URLs
  - Category selection (Productivity, Developer Tools, etc.)
  - Permission selection (fs:read, fs:write, net:http, etc.)
  - API route (`/api/plugins/submit`) validates and inserts plugins

- [x] **Usage Tracking:**
  - Created `lib/usage.ts` with tracking functions
  - `trackUsage()` - records usage and updates monthly aggregates
  - `getMonthlyUsage()` - fetches current month's usage
  - `checkUsageLimit()` - validates against tier limits
  - API route (`/api/usage`) for GET/POST usage data
  - Dashboard now shows real usage data from database

- [x] **API Key Generation:**
  - Created `/dashboard/api-keys` page
  - `ApiKeyManager` client component for key management
  - API routes (`/api/keys`, `/api/keys/[id]`) for CRUD
  - Secure key generation with SHA-256 hashing
  - Keys shown only once, stored as hashes

**New Files:**
- `apps/web/src/lib/stripe.ts` - Stripe client and pricing config
- `apps/web/src/lib/usage.ts` - Usage tracking utilities
- `apps/web/src/app/pricing/page.tsx` - Pricing page
- `apps/web/src/app/api/stripe/checkout/route.ts` - Checkout API
- `apps/web/src/app/api/stripe/webhook/route.ts` - Webhook handler
- `apps/web/src/app/api/stripe/portal/route.ts` - Customer portal
- `apps/web/src/app/dashboard/subscription/page.tsx` - Subscription management
- `apps/web/src/app/plugins/submit/page.tsx` - Plugin submission form
- `apps/web/src/app/api/plugins/submit/route.ts` - Plugin submission API
- `apps/web/src/app/dashboard/api-keys/page.tsx` - API keys page
- `apps/web/src/app/dashboard/api-keys/api-key-manager.tsx` - Key manager component
- `apps/web/src/app/api/keys/route.ts` - API keys CRUD
- `apps/web/src/app/api/keys/[id]/route.ts` - Delete API key
- `apps/web/src/app/api/usage/route.ts` - Usage tracking API

**Environment Variables Added (apps/web/.env):**
```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Optional: Stripe Price IDs
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
# etc.
```

**Routes Added:**
- `/pricing` - Pricing page with tier comparison
- `/plugins/submit` - Plugin submission form (auth required)
- `/dashboard/subscription` - Subscription management
- `/dashboard/api-keys` - API key management
- `/api/stripe/checkout` - POST: Create checkout session
- `/api/stripe/webhook` - POST: Handle Stripe webhooks
- `/api/stripe/portal` - GET: Redirect to Stripe portal
- `/api/plugins/submit` - POST: Submit new plugin
- `/api/keys` - GET/POST: List/create API keys
- `/api/keys/[id]` - DELETE: Remove API key
- `/api/usage` - GET/POST: Usage data

**Next Session:**
- [x] Run database migrations with Drizzle (`bun run db:push`) ✅
- [ ] Set up Stripe products/prices in dashboard
- [x] Desktop app: Web auth integration ✅
- [ ] Desktop app: Cloud sync with web account
- [ ] Plugin verification workflow

---

#### Session 22 (continued) - Dec 17, 2025
**Status:** Desktop App Web Authentication COMPLETE ✅

**Completed:**
- [x] **Deep Link URL Scheme:**
  - Added `tauri-plugin-deep-link` for `launcher://` URL handling
  - Configured in `tauri.conf.json` with `launcher` scheme
  - Deep link handler parses `launcher://auth/callback?token=xxx`

- [x] **Desktop Auth Module (`src-tauri/src/auth.rs`):**
  - `WebAuth` struct manages session state
  - Secure token storage via system keyring
  - `get_login_url()` - generates web auth URL
  - `handle_callback()` - exchanges one-time token for session
  - `logout()` - clears session from keyring
  - Session refresh support

- [x] **Web Auth Endpoints:**
  - `/auth/desktop` - Auth page that generates one-time token
  - `/api/auth/desktop/exchange` - Exchanges token for session
  - `/api/auth/desktop/refresh` - Refreshes expired sessions
  - `lib/desktop-auth.ts` - Shared token management

- [x] **Desktop Frontend Integration:**
  - `stores/auth.ts` - Zustand store for auth state
  - Settings → Accounts tab shows "Launcher Account" section
  - Sign In button opens browser to web app
  - Deep link callback updates auth state
  - Sign Out button clears session

**New Files (Desktop):**
- `apps/launcher/src-tauri/src/auth.rs` - Web auth module
- `apps/launcher/src/stores/auth.ts` - Auth Zustand store

**New Files (Web):**
- `apps/web/src/lib/desktop-auth.ts` - Token management
- `apps/web/src/app/auth/desktop/page.tsx` - Desktop auth page
- `apps/web/src/app/api/auth/desktop/exchange/route.ts` - Token exchange
- `apps/web/src/app/api/auth/desktop/refresh/route.ts` - Token refresh

**Modified Files:**
- `apps/launcher/src-tauri/tauri.conf.json` - Added deep-link plugin config
- `apps/launcher/src-tauri/Cargo.toml` - Added tauri-plugin-deep-link
- `apps/launcher/src-tauri/src/lib.rs` - Integrated auth module
- `apps/launcher/src/components/Launcher.tsx` - Auth listener setup
- `apps/launcher/src/components/Settings.tsx` - Launcher Account UI

**Auth Flow:**
1. User clicks "Sign In" in desktop Settings → Accounts
2. Browser opens to `http://localhost:3000/auth/desktop`
3. User authenticates via Stack Auth (Google/GitHub)
4. Web generates one-time token, redirects to `launcher://auth/callback?token=xxx`
5. Desktop receives deep link, exchanges token for session
6. Session stored in system keyring, user shown as logged in

**Next Session:**
- [ ] Set up Stripe products/prices in Stripe Dashboard
- [ ] Implement cloud sync (settings, plugins, frecency)
- [ ] Plugin verification workflow

---

## Session 23: Build Optimization & Web-to-Desktop Plugin Installation

**Date:** December 17, 2025

**Focus:** Monorepo build optimization, deep link debugging, web-to-desktop plugin installation

### Completed

**Build Process Optimization:**
- [x] Updated root `package.json` with comprehensive scripts:
  - `dev`, `build`, `lint`, `test`, `typecheck`, `clean`
  - App-specific: `dev:desktop`, `dev:web`, `dev:server`, `dev:services`
  - Build variants: `build:desktop`, `build:web`, `build:server`, `build:packages`
  - Database: `db:push`, `db:generate`, `db:migrate`, `db:studio`
  - Tauri: `tauri:dev`, `tauri:build`
- [x] Updated `turbo.json` with proper task pipelines:
  - TUI mode enabled
  - Environment variables configured per task
  - Database tasks added with proper caching disabled
  - `typecheck` task added with build dependencies

**Deep Link Authentication Fixes:**
- [x] Fixed Wayland global hotkey issue with `GDK_BACKEND=x11`
- [x] Changed hotkey from `Alt+Space` to `Super+Space` (avoids KRunner conflict)
- [x] Registered `launcher://` protocol with Linux desktop (`.desktop` file)
- [x] Added `tauri-plugin-single-instance` for proper deep link handling on Linux
- [x] Fixed URL parsing (host='auth', path='/callback')
- [x] Fixed duplicate token exchange with pending token tracking
- [x] Added file-based token storage for Next.js multi-process compatibility
- [x] Settings UI now updates immediately when auth callback received

**Web-to-Desktop Plugin Installation:**
- [x] Added deep link handler for `launcher://install?plugin=<id>`
- [x] Updated web plugin detail page with "Install in Launcher" button
- [x] Desktop app shows installation status (installing/success/error)
- [x] Window auto-shows and focuses when install deep link received

**Code Fixes:**
- [x] Fixed "use server" error in dashboard by moving `PRICING_TIERS` to `lib/pricing.ts`
- [x] Updated imports in pricing, dashboard, and subscription pages

### New/Modified Files

**Desktop App:**
- `apps/launcher/src-tauri/src/lib.rs` - Single-instance plugin, install deep link handler
- `apps/launcher/src-tauri/src/auth.rs` - Pending token tracking
- `apps/launcher/src-tauri/Cargo.toml` - Added tauri-plugin-single-instance
- `apps/launcher/src/components/Launcher.tsx` - Install plugin event listener, status UI
- `apps/launcher/src/components/Settings.tsx` - Auth callback listener
- `apps/launcher/package.json` - Added `GDK_BACKEND=x11` to tauri script
- `apps/launcher/launcher-handler.desktop` - Deep link protocol registration

**Web App:**
- `apps/web/src/lib/pricing.ts` - New file for pricing constants
- `apps/web/src/lib/stripe.ts` - Removed pricing constants (use server only)
- `apps/web/src/lib/desktop-auth.ts` - File-based token storage for dev
- `apps/web/src/app/plugins/[id]/page.tsx` - Install in Launcher button

**Root:**
- `package.json` - Comprehensive monorepo scripts
- `turbo.json` - Task pipelines with env vars

### Deep Link URLs

| URL Pattern | Purpose |
|-------------|---------|
| `launcher://auth/callback?token=xxx` | Desktop authentication callback |
| `launcher://install?plugin=<id>` | Install plugin from web |

### Known Issues

- On Wayland, must use `GDK_BACKEND=x11` for global hotkeys to work
- KRunner grabs `Alt+Space`, so using `Super+Space` instead

---

## Session 24: Stripe Integration with 3 Tiers (Free/Pro/Pro+)

**Date:** December 17, 2025

**Focus:** Simplified pricing tiers with Stripe product metadata for quota control

### Completed

**Stripe Products Configured:**
- [x] Pro: `prod_TccMqCLWhM5L7S` - $5/month
- [x] Pro+: `prod_TcdUSMqgFUVScM` - $15/month
- [x] Set product metadata for quota control:
  - `tier`, `ai_queries_per_month`, `ai_embeddings_per_month`, `max_plugins`, `features`

**Pricing System Updated:**
- [x] Simplified from 4 tiers (Free/Pro/Team/Enterprise) to 3 tiers (Free/Pro/Pro+)
- [x] Created `lib/stripe-pricing.ts` - fetches pricing dynamically from Stripe
- [x] Created `/api/stripe/pricing` endpoint - returns tier data with Stripe metadata
- [x] Updated `lib/pricing.ts` with new tier structure and helper functions
- [x] Pricing page now fetches from Stripe API (5-minute cache)

**Database Schema Updated:**
- [x] Updated `subscriptionTierEnum` to `["free", "pro", "pro_plus"]`
- [x] Updated `TIER_LIMITS` in schema.ts

**Files Modified:**
- `apps/web/src/lib/pricing.ts` - 3 tiers with Stripe product/price IDs
- `apps/web/src/lib/stripe-pricing.ts` - Dynamic Stripe pricing fetch (new)
- `apps/web/src/app/api/stripe/pricing/route.ts` - Pricing API endpoint (new)
- `apps/web/src/app/pricing/page.tsx` - 3-column grid, fetches from API
- `apps/web/src/app/api/stripe/checkout/route.ts` - Updated imports
- `apps/web/src/app/api/stripe/webhook/route.ts` - Updated tier types
- `packages/db/src/schema.ts` - Updated tier enum and limits

### Stripe Product Metadata Structure

```json
{
  "tier": "pro",
  "ai_queries_per_month": "1000",
  "ai_embeddings_per_month": "5000",
  "max_plugins": "50",
  "features": "AI-powered search,AI commands,Cloud sync,Priority support"
}
```

### Pricing Tiers

| Tier | Price | AI Queries | Plugins |
|------|-------|------------|---------|
| Free | $0 | 50/month | 5 max |
| Pro | $5/month | 1,000/month | 50 max |
| Pro+ | $15/month | 10,000/month | Unlimited |

### Next Steps
- [ ] Run `bun run db:push` to sync schema changes to database
- [ ] Add yearly pricing in Stripe Dashboard
- [ ] Implement cloud sync (settings, plugins, frecency)
- [ ] Plugin verification workflow

---

## Phase 1 Checklist

### Window & Hotkey Foundation
- [x] Configure `tauri.conf.json`: transparent, borderless, always-on-top
- [x] Global hotkey registration (default `Alt+Space`)
- [x] Window toggle: show/hide with hotkey
- [x] Auto-focus input on window show
- [x] Click-outside or Escape to dismiss

### Theme Engine (Chameleon)
- [x] Rust: `get_system_theme` command (Linux GTK/KDE)
- [x] React: Theme loading on mount
- [x] CSS variables injection
- [ ] Window blur/vibrancy (compositor-dependent, partial)

### Search UI
- [x] Centered search bar
- [x] Results list
- [x] Keyboard navigation (arrows, Enter)
- [x] Result item component

### Inline Calculator
- [x] Math expression detection
- [x] Instant evaluation display
- [x] Copy result on click

### Basic Providers
- [x] `CalculatorProvider` - Math evaluation (meval crate)
- [x] `AppProvider` - Linux .desktop file discovery
- [x] Provider trait foundation

---

## Architecture Notes

### Frontend Stack
- React 18+ (TypeScript)
- Vite
- Tailwind CSS v4
- Shadcn/UI (Radix)
- Zustand (state)
- Framer Motion (animations)
- Lucide React (icons)

### Backend Stack
- Rust (Edition 2021)
- Tauri v2
- Tokio (async)
- meval (math eval)
- freedesktop-desktop-entry (Linux apps)

### IPC Pattern
React sends query → Rust processes → Returns `Vec<ResultItem>` → React renders
