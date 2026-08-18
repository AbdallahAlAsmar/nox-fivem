# Run Phase 1

## Prerequisites
- Node.js 18+
- pnpm 9+
- Supabase project (active)
- OmniRoute running on localhost:20128

## Setup

```bash
cd D:/fivem-dev

# 1. Create .env with your credentials
cp .env.example .env
# Edit .env:
# - DATABASE_URL (from Supabase)
# - Clerk keys (from clerk.com)
# - OMNIROUTE_API_KEY (from http://localhost:20128)

# 2. Push database schema
cd packages/db && npx prisma db push

# 3. Start all services
cd .. && pnpm dev
```

## Ports

| Service | Port |
|---------|------|
| Web Dashboard | 3000 |
| Orchestrator API | 3001 |
| Orchestrator WebSocket | 3002 |
| OmniRoute | 20128 |
| Supabase | 5432 |

## Quick Test

```bash
# Test OmniRoute
curl http://localhost:20128/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"auto/best-coding","messages":[{"role":"user","content":"Hi"}]}'

# Test Web Dashboard
open http://localhost:3000

# Test Orchestrator
curl http://localhost:3001/health
```
