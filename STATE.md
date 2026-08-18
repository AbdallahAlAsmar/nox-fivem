# FiveM AI Developer SaaS - Current State & Context

## Project Status (as of 2026-08-15)

### Completed
- Monorepo structure (pnpm + Turborepo)
- Next.js web dashboard with Clerk auth
- Fastify orchestrator with WebSocket gateway
- Node.js CLI agent with improved Lua manifest parsing
- Tauri desktop agent (stub - needs Rust backend wired)
- Shared protocol with Zod schemas
- Prisma database schema
- Clerk auth integration
- OmniRoute AI integration (auto/best-coding model)
- Agent pairing flow
- Chat with AI streaming
- Filesystem actions (read, list, applyPatch)
- Git actions (checkpoint, rollback)
- Resource scanning with improved parser
- Change staging & approval flow
- UI components (Button, Card, Badge, Input, Label)
- Security middleware (CSP, XSS protection, etc.)
- Chat panel with skill selector
- Responsive dashboard layout
- Unit tests (12 passing tests)

### In Progress
- Tauri app TypeScript errors (needs Config interface fix)
- wss:// support for production

### Blocked
- Supabase database connection (project may be paused, needs resuming)
- Clerk JWKS URL configuration (needs production domain)

## Key Files
- Web dashboard: apps/web/app/
- Orchestrator: apps/orchestrator/src/
- Agent CLI: apps/agent/src/
- Tauri app: apps/tauri-agent/src/ (JS frontend) + src-tauri/src/ (Rust backend)
- Shared protocol: packages/shared/src/protocol/
- Database schema: packages/db/prisma/schema.prisma
- Config: apps/orchestrator/src/config/index.ts

## Environment Variables Needed
- DATABASE_URL (Supabase)
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- CLERK_JWKS_URL (for JWT verification)
- OMNIROUTE_API_KEY (optional, for local AI)
- ORCHESTRATOR_URL (default: http://localhost:3001)

## Commands
- Install: `pnpm install`
- Dev: `pnpm dev` (starts all apps)
- Build: `pnpm build`
- Typecheck: `pnpm typecheck`
- Test: `pnpm test`
- DB push: `pnpm db:push`
- DB studio: `pnpm db:studio`

## Next Steps
1. Fix Tauri TypeScript errors (Config interface missing fields)
2. Add wss:// support for production
3. Complete Tauri WebSocket client
4. Fix Supabase connection (unpause if needed)
5. Configure Clerk JWKS URL for production
6. Add more UI components (Table, Dialog, etc.)
7. Deploy to production

## Test Results
- @fivem-ai/shared: 9 tests passing
- @fivem-ai/orchestrator: 2 tests passing
- @fivem-ai/agent: 12 tests passing
