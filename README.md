# FiveM AI Developer SaaS

A SaaS platform for FiveM server owners to chat with an AI developer that can safely read, modify, and manage their server files.

## Architecture

```
┌─────────────────────────────────────────┐
│  WEB DASHBOARD (Next.js)                │
│  • Auth (Clerk)                         │
│  • Server management                    │
│  • Chat UI                              │
│  • Diff preview & approval              │
│  • Audit logs                           │
└────────────────┬────────────────────────┘
                 │ HTTP/WS
┌────────────────▼────────────────────────┐
│  CLOUD ORCHESTRATOR (Fastify)           │
│  • WebSocket gateway                    │
│  • AI integration (OmniRoute)           │
│  • Agent connection management          │
│  • Change staging & approval            │
│  • Postgres (Supabase)                  │
└────────────────┬────────────────────────┘
                 │ WSS (outbound)
┌────────────────▼────────────────────────┐
│  DESKTOP AGENT (Tauri/Rust)             │
│  • Installed on customer VPS/RDP        │
│  • Scoped file access                   │
│  • Git checkpoints                      │
│  • Resource restart                     │
│  • Console tailing                      │
└─────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+
- Supabase account (for database)
- Clerk account (for auth)
- OmniRoute running locally (optional, for AI)

### Setup

1. **Clone and install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Setup database:**
   ```bash
   pnpm db:push
   ```

4. **Start development servers:**
   ```bash
   pnpm dev
   ```

This starts:
- Web dashboard: http://localhost:3000
- Orchestrator: http://localhost:3001
- WebSocket gateway: ws://localhost:3001/ws/agent

### Prompt Studio

The public prompt generator is available at http://localhost:3000/prompt. It uses the existing Clerk session and Postgres database for signed-in history. Guests can generate up to five prompt turns per day from the same IP; guest conversations are kept only in the browser session. Signed-in users can preview generated Markdown files and download them as a ZIP.

The web app needs server-side `OMNIROUTE_API_KEY` and `OMNIROUTE_BASE_URL` values (or `PROMPT_AI_BASE_URL`) to reach OmniRoute. Prompt routing defaults to `auto/smart` with `auto` fallback; override these with `PROMPT_AI_PRIMARY_MODEL` and `PROMPT_AI_FALLBACK_MODEL`. Configure a random `PROMPT_RATE_LIMIT_SALT` in production. Apply the new database tables with `pnpm db:migrate` before deploying.

## Project Structure

```
fivem-ai-developer/
├── apps/
│   ├── web/              # Next.js dashboard
│   ├── orchestrator/     # Fastify backend
│   ├── agent/            # Node CLI agent
│   └── tauri-agent/      # Tauri desktop app
├── packages/
│   ├── shared/           # Shared types & protocol
│   ├── db/               # Prisma schema & client
│   └── config/           # Shared TS configs
├── .env                  # Credentials
└── pnpm-workspace.yaml
```

## Phase 1 Features

- [x] Monorepo setup
- [x] Auth integration (Clerk)
- [x] Dashboard foundation
- [x] Desktop agent (stub)
- [x] Agent ↔ Orchestrator connection
- [x] QBCore resource scanning
- [x] Chat with AI (read-only)
- [x] Diff preview
- [x] Apply with checkpoint
- [x] Resource restart
- [x] Rollback
- [x] Audit logging

## Safety Model

1. **Agent is scoped** to one server-data directory
2. **AI cannot write directly** - only stage changes
3. **Human must approve** every change
4. **Git checkpoint** before every apply
5. **One-click rollback** always available
6. **Full audit trail** for all actions

## License

Private - All rights reserved
