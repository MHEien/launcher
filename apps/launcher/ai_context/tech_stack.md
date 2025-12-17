# Technology Stack & Constraints

## Core Backend (Rust)
* **Language:** Rust (Edition 2021)
* **Framework:** Tauri v2 (Stable)
* **Async Runtime:** Tokio
* **Responsibilities:**
  - System IO, Window Management, Global Hotkeys
  - File/App Indexing and Search
  - Plugin Sandbox (WASM runtime)
  - OAuth token management
  - OS theme detection

### Key Crates
| Crate | Purpose |
|-------|---------|
| `tauri` | App framework, IPC, window management |
| `tokio` | Async runtime |
| `serde` / `serde_json` | Serialization |
| `tantivy` | Full-text search indexing |
| `notify` | Filesystem watching |
| `window-vibrancy` | Window blur effects |
| `wasmtime` | WASM plugin runtime |
| `keyring` | Secure credential storage |
| `meval` or `fasteval` | Math expression evaluation |
| `freedesktop-desktop-entry` | Linux app discovery |
| `windows` | Windows API access |

## Frontend (React)
* **Framework:** React 18+ (TypeScript)
* **Build Tool:** Vite
* **Styling:** Tailwind CSS v4
* **UI Library:** Shadcn/UI (Radix Primitives)
* **State Management:** Zustand
* **Icons:** Lucide React
* **Animations:** Framer Motion

## Integration Rules
* **IPC:** All heavy lifting in Rust. React only renders data received via Tauri commands.
* **Type Safety:** `ts-rs` or `specta` for auto-generating TypeScript types from Rust structs.
* **Events:** Tauri events for Rust → React push updates (theme changes, index updates).

## Plugin System
* **Runtime:** WASM (via `wasmtime`) for sandboxed, cross-platform plugins
* **Plugin API:** Defined traits/interfaces plugins must implement
* **Capabilities:** Plugins request permissions (network, filesystem, OAuth scopes)

## AI Integration (Premium - Closed Source)
* **Backend:** Separate service handling AI requests
* **Protocol:** Streaming responses via SSE or WebSocket
* **Tool System:** JSON-RPC style tool definitions AI can invoke
* **Context:** Indexer provides relevant file/app context to AI

## Platform-Specific Notes
| Platform | Theme Detection | App Discovery | Window Effects |
|----------|-----------------|---------------|----------------|
| Linux | GTK/KDE configs, `gsettings` | `.desktop` files, XDG dirs | Compositor-dependent blur |
| Windows | Registry, `dwmapi` | Start menu, `shell32` | Mica, Acrylic |
| macOS | `NSAppearance`, system prefs | `/Applications`, Spotlight | Vibrancy |