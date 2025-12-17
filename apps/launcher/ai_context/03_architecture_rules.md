# Architectural Guidelines

## 1. The "Thin Client" Principle
The React frontend should be dumb. It sends a user query string to Rust, and Rust returns a `Vector<ResultItem>`. 
* **Bad:** React filtering a list of 50,000 files.
* **Good:** Rust filtering files and sending the top 20 to React.

## 2. Powerful Indexer Architecture
Fast search requires a robust indexing system:
* **Background indexing:** Continuously index files, apps, commands on startup and file changes
* **Incremental updates:** Watch filesystem for changes, update index without full rebuild
* **Fuzzy matching:** Typo-tolerant search with ranking by relevance and recency
* **Context for AI:** Indexed data provides rich context for AI features
* **Key crates:** `tantivy` (full-text search), `notify` (file watching)

## 3. The Plugin System
Structure core functionality as "Providers" that plugins can extend:

### Provider Trait
```rust
trait SearchProvider {
    fn id(&self) -> &str;
    fn search(&self, query: &str) -> Vec<SearchResult>;
    fn execute(&self, result: &SearchResult) -> Result<()>;
}
```

### Core Providers (Built-in)
* `AppProvider` - Installed applications
* `FileProvider` - File search via indexer
* `CalculatorProvider` - Inline math evaluation
* `CommandProvider` - System commands, shell access

### Plugin Providers (Extensible)
* Loaded via WASM for sandboxing and cross-platform compatibility
* Can register new providers, actions, and UI components
* Access to controlled APIs (network, storage, OAuth tokens)

## 4. OAuth & Third-Party Integration
Plugins connecting to SaaS services need secure auth:
* **OAuth flow:** Rust handles OAuth dance, stores tokens securely in OS keychain
* **Token management:** Automatic refresh, secure storage per-plugin
* **Permission model:** User grants specific scopes to plugins
* **Supported patterns:** OAuth 2.0, API keys, custom auth via plugin config

## 5. Plugin Marketplace Architecture
* **Client (Open Source):** Browse, search, install, update plugins from within launcher
* **Backend (Proprietary):** Plugin hosting, versioning, reviews, developer accounts
* **Installation:** Download plugin WASM bundle → verify signature → install to local plugin dir
* **Updates:** Check for updates on launch, notify user, one-click update

## 6. The "Chameleon" Theme Engine
On startup, Rust must query the OS for:
* Accent Color (GTK, KDE, Windows registry, macOS)
* Dark/Light Mode
* Window blur capability (Mica on Windows, blur on Linux compositors)

This data is passed to React to inject into CSS Variables (`--accent`, `--bg-opacity`).

### Theme Marketplace
* Themes are CSS variable bundles + optional assets
* Users can browse/install themes from marketplace
* Custom themes override OS detection

## 7. AI Integration Points (Premium)
* **Chat interface:** Separate view that morphs from search bar
* **Tool system:** AI can call registered tools (file ops, app launch, plugin actions)
* **Context injection:** Indexer provides relevant context to AI
* **Plugin tools:** Plugins can register tools the AI can invoke
* **Streaming:** Real-time response streaming for chat UX