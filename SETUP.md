# FiveM AI Developer - Phase 1 Setup Guide

## What's Been Built

This Phase 1 MVP includes:

1. **Monorepo Structure** - pnpm workspace with Turborepo
2. **Database Schema** - Complete Prisma schema for organizations, users, servers, agents, chat, changes, and audit logs
3. **Shared Protocol** - TypeScript types and Zod schemas for WebSocket messages
4. **Web Dashboard** - Next.js app with Clerk auth, server management UI
5. **Cloud Orchestrator** - Fastify backend with WebSocket gateway and HTTP API
6. **Desktop Agent** - Node.js CLI with filesystem access, git checkpoints, and FiveM integration

## Quick Start

### Step 1: Configure Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Project Settings → Database
3. Copy the connection string (URI format)
4. Update `.env`:

```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Step 2: Configure Clerk

1. Go to [clerk.com](https://clerk.com) and create a new application
2. Copy the publishable key and secret key
3. Update `.env`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

### Step 3: Configure Anthropic

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Update `.env`:

```bash
ANTHROPIC_API_KEY="sk-ant-..."
```

### Step 4: Initialize Database

```bash
# Generate Prisma client (already done)
pnpm db:generate

# Push schema to Supabase
pnpm db:push

# Optional: Open Prisma Studio to view data
pnpm db:studio
```

### Step 5: Start Development

```bash
# Start all services
pnpm dev
```

This starts:
- **Web Dashboard**: http://localhost:3000
- **Orchestrator API**: http://localhost:3001
- **WebSocket Gateway**: ws://localhost:3001/ws/agent

## Project Structure

```
D:/fivem-dev/
├── apps/
│   ├── web/                    # Next.js Dashboard
│   │   ├── app/
│   │   │   ├── dashboard/      # Protected routes
│   │   │   │   ├── page.tsx    # Server list
│   │   │   │   ├── layout.tsx  # Dashboard shell
│   │   │   │   └── servers/
│   │   │   │       └── new/    # Add server + pairing
│   │   │   ├── page.tsx        # Landing page
│   │   │   └── layout.tsx      # Root layout with Clerk
│   │   └── middleware.ts       # Auth protection
│   │
│   ├── orchestrator/           # Fastify Backend
│   │   └── src/
│   │       ├── index.ts        # Server entry
│   │       ├── config/         # Environment config
│   │       ├── http/routes.ts  # REST API
│   │       └── ws/
│   │           └── agentGateway.ts  # WebSocket handler
│   │
│   └── agent/                  # Desktop Agent CLI
│       └── src/
│           ├── index.ts        # CLI entry
│           ├── fs/             # Filesystem actions
│           ├── git/            # Git checkpoint/rollback
│           ├── fivem/          # Resource restart
│           └── scanner/        # QBCore detection
│
├── packages/
│   ├── shared/                 # Shared types & protocol
│   │   └── src/
│   │       ├── protocol/       # WebSocket message schemas
│   │       └── types/          # Domain types
│   │
│   ├── db/                     # Prisma database
│   │   └── prisma/
│   │       └── schema.prisma   # Full schema
│   │
│   └── config/                 # Shared configs
│
└── .env                        # Your credentials
```

## Next Steps to Complete Phase 1

### 1. Chat Integration with Claude

The orchestrator has routes for chat, but you need to add the Claude Agent SDK integration:

```bash
cd apps/orchestrator
pnpm add @anthropic-ai/claude-agent-sdk
```

Create `apps/orchestrator/src/claude/session.ts` to:
- Initialize Claude with your API key
- Define custom tools (read_remote_file, propose_remote_write)
- Stream responses to the dashboard

### 2. Agent Pairing Flow

The pairing UI exists, but needs orchestrator integration:

1. User clicks "Add Server" in dashboard
2. Dashboard calls `POST /api/servers` 
3. Orchestrator creates server + generates pairing code
4. User runs `fivem-agent pair` with the code
5. Agent calls orchestrator with pairing token
6. Orchestrator validates and marks agent as "paired"

### 3. Chat UI Component

Create `apps/web/components/chat/`:
- `chat-panel.tsx` - Main chat interface
- `message-list.tsx` - Message display
- `input-box.tsx` - User input
- `diff-preview.tsx` - Show proposed changes

### 4. Apply/Rollback Flow

Wire up the dashboard buttons to:
1. Call `POST /api/changes/:changeId/apply`
2. Orchestrator sends checkpoint command to agent
3. Agent creates git commit
4. Orchestrator sends apply command
5. Agent writes files
6. Orchestrator sends restart command
7. Agent restarts resource via txAdmin
8. Dashboard shows success/errors

### 5. Test with Real QBCore Server

1. Set up a local FXServer with QBCore
2. Run the agent pointing to your server-data
3. Test the full flow:
   - Pair
   - Scan
   - Chat
   - Preview diff
   - Apply
   - Rollback

## Environment Variables

Create `.env` in the root:

```bash
# Database (Supabase)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# AI (Anthropic)
ANTHROPIC_API_KEY="sk-ant-..."

# Orchestrator
ORCHESTRATOR_PORT=3001
JWT_SECRET="generate-a-random-32-char-string"

# Web
PORT=3000
ORCHESTRATOR_URL="http://localhost:3001"
```

For the agent, create `apps/agent/.env`:

```bash
AGENT_SERVER_ID="from-pairing"
AGENT_DEVICE_ID="from-pairing"
ORCHESTRATOR_WS_URL="ws://localhost:3001/ws/agent"
SERVER_DATA_PATH="C:/FXServer/server-data"
```

## API Endpoints

### Orchestrator (http://localhost:3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/servers | List servers |
| POST | /api/servers | Create server |
| GET | /api/servers/:id | Get server details |
| GET | /api/servers/:id/resources | Get resource index |
| POST | /api/servers/:id/scan | Trigger resource scan |
| GET | /api/servers/:id/threads | Get chat threads |
| POST | /api/servers/:id/threads | Create chat thread |
| GET | /api/threads/:id/messages | Get messages |
| GET | /api/servers/:id/changes | Get changes |
| GET | /api/changes/:id | Get change details |
| POST | /api/changes/:id/apply | Apply a change |

### WebSocket (ws://localhost:3001/ws/agent)

Messages:
- `agent.hello` - Agent authentication
- `agent.heartbeat` - Keepalive
- `agent.request` - Command from orchestrator
- `agent.response` - Result from agent

## Security Model

1. **Agent is scoped** to one directory - validates all paths
2. **AI cannot write directly** - only stages diffs
3. **Human approval required** - every change must be approved
4. **Git checkpoints** - before every apply
5. **One-click rollback** - always available
6. **Audit trail** - every action logged

## Commands

```bash
# Development
pnpm dev              # Start all services
pnpm build            # Build all apps
pnpm typecheck        # Type check all
pnpm lint             # Lint all

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:studio        # Open Prisma Studio

# Agent (from apps/agent)
pnpm dev start        # Start agent
pnpm dev pair         # Pair with dashboard
```

## What's Working Now

✅ Monorepo setup with pnpm workspaces
✅ TypeScript configuration
✅ Prisma schema with all tables
✅ Shared protocol types
✅ Web dashboard with auth (Clerk)
✅ Server list and add server UI
✅ Pairing code generation UI
✅ Orchestrator HTTP routes
✅ WebSocket gateway skeleton
✅ Agent CLI with commands
✅ Filesystem actions with path validation
✅ Git checkpoint/rollback logic
✅ QBCore scanner
✅ Resource restart skeleton

## What Needs Implementation

🔲 Claude Agent SDK integration
🔲 Chat streaming to dashboard
🔲 Agent pairing validation
🔲 Apply command routing
🔲 Console tailing
🔲 Usage metering
🔲 Stripe billing
🔲 Windows installer for agent
🔲 Auto-updater
🔲 Production deployment

## Questions?

Ask in the Discord thread. The foundation is solid - the rest is connecting the pieces.
