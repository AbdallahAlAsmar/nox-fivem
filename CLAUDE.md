# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"FiveM AI Developer" (NOX) — a SaaS platform where FiveM server owners chat with an AI that can read, modify, and manage their server files. The core safety invariant: **the AI never writes files directly**. It stages changes as `Change` records; a human approves each one; the agent creates a git checkpoint before applying and supports rollback.

## Commands

Monorepo: pnpm 9 workspaces + Turborepo. Run from repo root unless noted.

```bash
pnpm install              # install all workspace deps
pnpm dev                  # run all apps in dev mode (turbo)
pnpm build                # build all (turbo)
pnpm typecheck            # tsc --noEmit across packages
pnpm lint                 # eslint across packages
pnpm test                 # vitest across packages

# Single app / single test
pnpm --filter @fivem-ai/web dev           # dashboard on :3000
pnpm --filter @fivem-ai/orchestrator dev  # orchestrator on :3001 (tsx watch)
pnpm --filter @fivem-ai/agent test        # agent tests only
cd apps/agent && pnpm vitest run filesystem.test.ts          # single test file
cd apps/orchestrator && pnpm vitest run diff.test.ts         # (same pattern everywhere)

# Database (Prisma + Postgres/Supabase)
pnpm db:generate          # prisma generate (run after editing schema.prisma)
pnpm db:push              # push schema to DB (no migration files)
pnpm db:migrate           # create+apply a dev migration
pnpm db:studio            # browse data

# Desktop agent (Tauri 2 + Rust; requires rustup/cargo)
cd apps/tauri-agent
pnpm tauri:dev            # run desktop app in dev
pnpm tauri:build          # production bundle
```

Vitest is configured per-package; note `apps/agent` keeps its tests at the package root (`apps/agent/*.test.ts`) — see its `vitest.config.ts` include patterns.

## Architecture

```
Web dashboard (Next.js, :3000)
    │ HTTP — proxied through vercel.json rewrite /api/orchestrator/* → orchestrator
Cloud Orchestrator (Fastify, :3001)
    │ outbound WSS  ws(s)://…/ws/agent   (agent dials OUT; no inbound ports on customer machines)
Desktop Agent (Tauri/Rust, installed on customer's server machine)
```

### Apps & packages

- `apps/web` — Next.js 14 App Router + Clerk auth (`middleware.ts` guards everything except `/`, sign-in/up, `/api`). Dashboard pages under `app/dashboard/*` (servers, resources, players, changes, audit, billing, onboarding). Talks to the orchestrator exclusively via `lib/api-base.ts` using `ORCHESTRATOR_URL` (defaults to `/api/orchestrator` proxy so the browser never hits mixed-HTTP issues).
- `apps/orchestrator` — Fastify server. Key modules:
  - `ws/agentGateway.ts` — connection registry keyed by `serverId`; `sendCommand(serverId, action, args, timeoutMs)` implements request/response correlation via `requestId` + pending-request timeouts.
  - `chat/chatService.ts` — streams AI responses (OmniRoute, an OpenAI-compatible endpoint configured by `OMNIROUTE_BASE_URL`/`OMNIROUTE_API_KEY`, client lives in `claude/session.ts`); dispatches tool calls (`read_remote_file`, `list_remote_directory`, `propose_remote_write`, …) to the agent via the gateway, persists tool results as messages so multi-turn context stays coherent.
  - `http/routes.ts` + `resourceRoutes.ts` — REST API consumed by the dashboard.
  - Config validation in `config/index.ts`: hard-fails in production if required env is missing.
- `apps/agent` — Node CLI agent (`pair` command with `XXXX-XXXX` pairing codes). Modules: `fs/filesystem.ts` (scoped file access), `git/git.ts` (checkpoint/rollback), `scanner/scanner.ts` (FiveM resource scanning incl. Lua manifest parsing), `fivem/fivem.ts`.
- `apps/tauri-agent` — the shipping desktop agent (React/Vite UI + Rust backend in `src-tauri/src/commands/`: `agent.rs` is the WebSocket client, plus `filesystem.rs`, `git.rs`, `scanner.rs`, `server.rs`). Implements the same protocol as the CLI agent.
- `packages/shared` — the contract between every layer. Zod schemas for the versioned message envelope (`protocol/envelope.ts`, `PROTOCOL_VERSION = '2026-08-12.v1'`) and all actions/payloads (`protocol/actions.ts`), error codes, plus shared hooks/retry/cache/error-analysis helpers. **Change message shapes here first**, then update consumers.
- `packages/db` — Prisma schema. Domain models: `Organization`, `Server`, `AgentDevice`, `ResourceIndex`, `ChatThread`, `ChatMessage`, `Change`, `Player`, `Usage`, `AuditLog`, `ResourceInstall` (plus billing tables: orders/products/licenses/etc.). Client export: `src/client.ts`.

### Cross-cutting rules

- Every agent↔orchestrator message is wrapped in an envelope validated against the Zod schemas; unknown types are logged and dropped, malformed ones get an `agent.error` reply.
- File writes always go: AI proposes → `Change` row staged with diff → user approves in dashboard → agent applies after git checkpoint → `AuditLog` entry. Preserve this chain when adding features.
- Agents are scoped to one server-data directory root; never add unscoped filesystem access.

## Environment

`.env.example` documents the variables: `DATABASE_URL`/`DIRECT_URL` (Supabase Postgres), Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`), `OMNIROUTE_API_KEY`/`OMNIROUTE_BASE_URL` (AI provider), `JWT_SECRET` (pairing tokens), `ORCHESTRATOR_PORT`, `NEXT_PUBLIC_ORCHESTRATOR_URL`. Orchestrator CORS defaults allow localhost:3000 and :1420 (Tauri).

## Deployment

- Web: Vercel (`vercel.json` at root builds `@fivem-ai/web` and rewrites `/api/orchestrator/(.*)` → the orchestrator host).
- Orchestrator: runs on a VPS (see `vps/README.md`, `vps/docker-compose.yml`); `deploy/start-tunnel.sh` and `scripts/tunnel-manager.*` manage Cloudflare tunnels for OmniRoute.
- Platform is Windows (win32) — prefer PowerShell-compatible commands; some package `clean` scripts use POSIX `rm`.
