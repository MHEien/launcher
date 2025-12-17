# Launcher Project - Cascade Initial Context

## Project Overview

This is a **cross-platform desktop launcher** (Raycast/Alfred alternative) built with:
- **Desktop App:** Tauri v2 + React 19 + TypeScript + Tailwind v4
- **Web App:** Next.js 16 + Stack Auth + Stripe
- **API Server:** Hono (Bun runtime)
- **Monorepo:** Turborepo with Bun workspaces

## Repository Structure

```
launcher/
├── apps/
│   ├── launcher/          # Tauri desktop app
│   │   ├── src/           # React frontend
│   │   ├── src-tauri/     # Rust backend
│   │   └── PROGRESS.md    # Session-by-session development log
│   ├── web/               # Next.js web dashboard & marketplace
│   └── server/            # Hono API for plugin registry
├── packages/
│   ├── db/                # Drizzle ORM + Neon PostgreSQL
│   └── shared/            # Shared types/utilities
├── package.json           # Root scripts (use `bun run <script>`)
└── turbo.json             # Task pipelines
```

## Key Commands

```bash
# Development
bun run dev:desktop      # Desktop app (uses GDK_BACKEND=x11 for Wayland)
bun run dev:web          # Web dashboard (port 3000)
bun run dev:server       # API server (port 3001)
bun run dev:services     # Web + Server together
bun run tauri:dev        # Alternative: direct Tauri dev

# Build
bun run build            # Build all
bun run build:desktop    # Build desktop installers

# Database
bun run db:push          # Push schema to Neon
bun run db:studio        # Open Drizzle Studio
```

## Current Status (Session 23)

### Completed Features
- ✅ Global hotkey (`Super+Space` on Linux, `Alt+Space` elsewhere)
- ✅ Transparent, borderless window with theme detection
- ✅ Calculator provider, App provider, File search (Tantivy indexer)
- ✅ Frecency-based result boosting
- ✅ WASM plugin system (wasmtime runtime)
- ✅ Plugin marketplace (web + desktop)
- ✅ OAuth providers (Google, GitHub, Notion, Slack, etc.)
- ✅ Desktop ↔ Web authentication via deep links
- ✅ Web-to-desktop plugin installation (`launcher://install?plugin=<id>`)
- ✅ Stripe subscription tiers (Free/Pro/Team/Enterprise)

### Deep Link URLs
| URL | Purpose |
|-----|---------|
| `launcher://auth/callback?token=xxx` | Desktop auth callback |
| `launcher://install?plugin=<id>` | Install plugin from web |

### Known Issues
- Wayland requires `GDK_BACKEND=x11` for global hotkeys
- KRunner grabs `Alt+Space`, so using `Super+Space` on KDE

## Key Files

### Desktop App (Rust)
- `src-tauri/src/lib.rs` - Main app, commands, deep link handlers
- `src-tauri/src/auth.rs` - Web authentication module
- `src-tauri/src/plugins/` - WASM plugin system
- `src-tauri/src/indexer/` - Tantivy file indexer
- `src-tauri/src/providers/` - Search providers

### Desktop App (React)
- `src/components/Launcher.tsx` - Main UI component
- `src/components/Settings.tsx` - Settings panel (tabs: Indexing, Plugins, Marketplace, Accounts)
- `src/stores/launcher.ts` - Zustand store for search state
- `src/stores/auth.ts` - Zustand store for auth state

### Web App
- `src/app/page.tsx` - Plugin marketplace homepage
- `src/app/plugins/[id]/page.tsx` - Plugin detail page
- `src/app/dashboard/` - User dashboard
- `src/app/pricing/page.tsx` - Subscription pricing
- `src/lib/pricing.ts` - Pricing tiers config
- `src/lib/desktop-auth.ts` - Desktop auth token management

### API Server
- `src/index.ts` - Hono routes for plugin registry

## Environment Variables

### Web App (.env)
```
DATABASE_URL=             # Neon PostgreSQL
NEXT_PUBLIC_API_URL=      # API server URL (default: http://localhost:3001)
NEXT_PUBLIC_APP_URL=      # Web app URL (default: http://localhost:3000)
STACK_PROJECT_ID=         # Stack Auth project
STACK_SECRET_SERVER_KEY=  # Stack Auth secret
STRIPE_SECRET_KEY=        # Stripe API key
STRIPE_WEBHOOK_SECRET=    # Stripe webhook secret
```

### Desktop App (.env)
```
LAUNCHER_WEB_URL=         # Web app URL (default: http://localhost:3000)
LAUNCHER_API_URL=         # API server URL (default: http://localhost:3001)
```

## Development Notes

1. **Always read `PROGRESS.md`** before starting work - it contains session-by-session development history
2. **Desktop app on Wayland:** Use `GDK_BACKEND=x11 bun tauri dev` or the built-in script
3. **Deep links on Linux:** Requires `.desktop` file registration (already set up in `~/.local/share/applications/`)
4. **Next.js "use server":** Cannot export non-async functions from "use server" files

## Next Steps (Suggested)
- [ ] Set up Stripe products/prices in Stripe Dashboard
- [ ] Implement cloud sync (settings, plugins, frecency)
- [ ] Plugin verification workflow
- [ ] Production deployment (Vercel for web, build installers for desktop)
