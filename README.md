# Launcher

A cross-platform launcher (Raycast alternative) with plugin marketplace.

## Tech Stack

- **Desktop App**: Tauri v2, React 19, TypeScript, Tailwind v4
- **Web Dashboard**: Next.js 16, React 19, Tailwind v4
- **API Server**: Hono, TypeScript
- **Database**: Neon Postgres (Drizzle ORM)
- **Auth**: Stack Auth (Neon Auth)
- **Payments**: Stripe
- **Cache**: Upstash Redis/Vector

## Project Structure

```
launcher/
├── apps/
│   ├── launcher/     # Desktop app (Tauri + React)
│   ├── web/          # Web dashboard (Next.js)
│   └── server/       # Plugin registry API (Hono)
├── packages/
│   ├── db/           # Drizzle ORM schema + Neon client
│   ├── cache/        # Upstash Redis/Vector clients
│   └── shared/       # Shared TypeScript types
├── package.json      # Workspace root (Bun)
└── turbo.json        # Turborepo config
```

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- [Rust](https://rustup.rs) (for Tauri)
- Node.js 18+ (for some tooling)

## Quick Start (Development)

```bash
# Install dependencies
bun install

# Start all services
bun run dev          # Runs all apps via Turborepo

# Or start individually:
cd apps/server && bun run dev    # API at http://localhost:3001
cd apps/web && bun run dev       # Web at http://localhost:3000
cd apps/launcher && bun tauri dev # Desktop app
```

## Environment Variables

### Web App (`apps/web/.env`)

```bash
# Database (Neon Postgres)
DATABASE_URL=postgresql://...

# Auth (Stack Auth / Neon Auth)
NEXT_PUBLIC_STACK_PROJECT_ID=your-project-id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_xxx
STACK_SECRET_SERVER_KEY=ssk_xxx

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# App URLs
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com

# Optional: Upstash
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Desktop App (`apps/launcher/.env`)

```bash
LAUNCHER_WEB_URL=https://your-domain.com
LAUNCHER_API_URL=https://api.your-domain.com
```

### Database (`packages/db/.env`)

```bash
DATABASE_URL=postgresql://...
```

## Database Setup

```bash
cd packages/db

# Push schema to database
bun run db:push

# Or generate migrations
bun run db:generate
bun run db:migrate

# Open Drizzle Studio
bun run db:studio
```

## Apps

### Desktop App (`apps/launcher`)

The main launcher application built with Tauri v2:

- **Global hotkey** (Alt+Space) to show/hide
- **File indexing** with Tantivy (~40k files)
- **Plugin system** (WASM via wasmtime)
- **OAuth integrations** (GitHub, Google, Notion, Slack)
- **Search providers** with prefixes (gh:, nt:, sl:, gd:, gc:)
- **Web authentication** via deep links (launcher://)

```bash
cd apps/launcher

# Development
bun tauri dev

# Build for production
bun tauri build
```

### Web Dashboard (`apps/web`)

Next.js 16 web application:

- **Plugin marketplace** - Browse, search, install plugins
- **User authentication** - Google/GitHub OAuth via Stack Auth
- **Subscription management** - Stripe integration (Free/Pro/Team/Enterprise)
- **Developer portal** - Submit and manage plugins
- **API key management** - Generate keys for desktop sync

```bash
cd apps/web

# Development
bun run dev

# Build
bun run build

# Production
bun run start
```

### API Server (`apps/server`)

Hono API server for plugin registry:

- `GET /api/plugins` - List all plugins
- `GET /api/plugins/:id` - Get plugin details
- `GET /api/categories` - List categories
- `GET /api/search?q=` - Search plugins

```bash
cd apps/server

# Development
bun run dev

# Production
bun run start
```

## Authentication Flow

The desktop app authenticates via the web dashboard:

1. User clicks "Sign In" in desktop Settings
2. Browser opens to `{WEB_URL}/auth/desktop`
3. User authenticates via Stack Auth (Google/GitHub)
4. Web redirects to `launcher://auth/callback?token=xxx`
5. Desktop exchanges token for session
6. Session stored securely in system keyring

## Subscription Tiers

| Feature | Free | Pro ($9/mo) | Team ($29/mo) | Enterprise |
|---------|------|-------------|---------------|------------|
| AI Queries | 50/mo | 1,000/mo | 5,000/mo | Unlimited |
| Plugins | 5 max | 50 max | Unlimited | Unlimited |
| Cloud Sync | ❌ | ✅ | ✅ | ✅ |
| Team Sharing | ❌ | ❌ | ✅ | ✅ |
| SSO/SAML | ❌ | ❌ | ❌ | ✅ |

## Production Deployment

### Web App (Vercel/Netlify)

1. Connect your Git repository
2. Set environment variables
3. Deploy

### API Server

Deploy to any Node.js hosting (Railway, Render, Fly.io):

```bash
cd apps/server
bun run build
bun run start
```

### Desktop App

Build installers for distribution:

```bash
cd apps/launcher
bun tauri build
# Outputs to src-tauri/target/release/bundle/
```

## Development

### Adding a new plugin provider

1. Create provider in `apps/launcher/src-tauri/src/providers/`
2. Implement `SearchProvider` trait
3. Register in `lib.rs`

### Database schema changes

```bash
cd packages/db
# Edit src/schema.ts
bun run db:generate  # Generate migration
bun run db:push      # Apply to database
```

## License

MIT
