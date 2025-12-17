# Phase 1: Core Shell & Instant Search

## Goal
Build the foundational launcher: hotkey-activated window with instant search, inline calculator, and OS theme integration.

## Tasks

### 1. Window & Hotkey Foundation
- [ ] Clean Tauri/React boilerplate
- [ ] Configure `tauri.conf.json`: transparent, borderless, always-on-top
- [ ] Global hotkey registration (configurable, default `Alt+Space`)
- [ ] Window toggle: show/hide with hotkey
- [ ] Auto-focus input on window show
- [ ] Click-outside or Escape to dismiss

### 2. Theme Engine (Chameleon)
- [ ] Rust: `get_system_theme` command
  - Linux: Read GTK/KDE theme, accent color
  - Windows: Registry accent color, dark/light mode
  - macOS: System preferences
- [ ] React: `useTheme` hook consuming Rust theme data
- [ ] CSS variables injection (`--accent`, `--bg`, `--text`, etc.)
- [ ] Window blur/vibrancy where supported

### 3. Search UI
- [ ] Centered search bar (Shadcn/UI style)
- [ ] Results list below search bar
- [ ] Keyboard navigation (arrow keys, Enter to execute)
- [ ] Result item component (icon, title, subtitle, shortcut hint)

### 4. Inline Calculator
- [ ] Detect math expressions in query (e.g., `2+2`, `sqrt(16)`)
- [ ] Evaluate and display result **above** search results instantly
- [ ] Copy result to clipboard on Enter or click

### 5. Basic Search Providers
- [ ] `CalculatorProvider` - Math evaluation
- [ ] `AppProvider` - List installed applications (platform-specific)
- [ ] Provider trait foundation for future extensibility

## Success Criteria
- Hotkey opens launcher instantly
- Typing `2+2` shows `4` immediately
- Typing app name shows matching apps
- Enter launches selected app
- Looks native on user's desktop (theme colors match)