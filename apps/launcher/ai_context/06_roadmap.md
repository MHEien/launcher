# Development Roadmap

## Phase 1: Core Shell & Instant Search ✦ Current
**Goal:** Functional launcher with hotkey, search, and theming

- [ ] Window management (transparent, borderless, hotkey toggle)
- [ ] OS theme detection (Linux GTK/KDE, Windows, macOS)
- [ ] Search bar UI with keyboard navigation
- [ ] Inline calculator (instant math evaluation)
- [ ] App provider (list/launch installed apps)
- [ ] Basic file search

**Deliverable:** Usable launcher that opens with hotkey, searches apps, does math

---

## Phase 2: Indexer & Advanced Search
**Goal:** Fast, comprehensive search across files and content

- [ ] Background file indexer using Tantivy
- [ ] Incremental index updates via filesystem watching
- [ ] Fuzzy matching with relevance ranking
- [ ] File content search (text files, PDFs, etc.)
- [ ] Search history and frecency boosting
- [ ] Settings UI for index configuration

**Deliverable:** Sub-100ms search across thousands of files

---

## Phase 3: Plugin Foundation
**Goal:** Extensible architecture with first plugins

- [ ] WASM runtime integration (wasmtime)
- [ ] Plugin manifest format and loader
- [ ] Permission system and sandboxing
- [ ] Host API for plugins (HTTP, storage, config)
- [ ] Plugin settings UI
- [ ] First-party plugins: Clipboard history, Snippets

**Deliverable:** Working plugin system with example plugins

---

## Phase 4: OAuth & SaaS Integrations
**Goal:** Secure third-party service connections

- [ ] OAuth flow handling in Rust
- [ ] Secure token storage (OS keychain)
- [ ] Token refresh and management
- [ ] First OAuth plugins: Google, GitHub, Notion
- [ ] Plugin permission prompts for OAuth scopes

**Deliverable:** Plugins can securely connect to SaaS services

---

## Phase 5: Plugin Marketplace
**Goal:** In-app plugin discovery and installation

- [ ] Marketplace UI in launcher
- [ ] Plugin search, categories, ratings
- [ ] One-click install/update/uninstall
- [ ] Plugin signing and verification
- [ ] Developer submission portal (separate project)

**Deliverable:** Users can browse and install plugins from marketplace

---

## Phase 6: Theme Marketplace
**Goal:** Customizable appearance with community themes

- [ ] Theme format specification (CSS variables + assets)
- [ ] Theme preview and installation
- [ ] Theme editor/creator tool
- [ ] Community theme submissions

**Deliverable:** Users can fully customize launcher appearance

---

## Phase 7: AI Integration (Premium)
**Goal:** Agentic AI assistant with tool use

- [ ] Chat UI (morphs from search bar)
- [ ] AI backend service (closed source)
- [ ] Streaming response rendering
- [ ] Tool system for AI actions
- [ ] Context injection from indexer
- [ ] Plugin-provided AI tools
- [ ] Subscription/auth for premium features

**Deliverable:** AI assistant that can search, execute actions, use plugins

---

## Phase 8: Polish & Launch
**Goal:** Production-ready release

- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Onboarding flow
- [ ] Documentation site
- [ ] Auto-updater
- [ ] Crash reporting and telemetry (opt-in)
- [ ] Marketing site and launch

**Deliverable:** Public release of Community Edition

---

## Future Ideas
- **Workflows:** Chain actions together (like Shortcuts/Automator)
- **Widgets:** Dashboard view with customizable widgets
- **Team features:** Shared snippets, plugins, configs
- **Mobile companion:** View/trigger actions from phone
- **Voice input:** Speak commands
- **Screen context:** AI understands what's on screen
- **Browser extension:** Search browser tabs, bookmarks, history
