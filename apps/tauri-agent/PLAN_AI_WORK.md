# NOX AI — Complete Implementation Plan

**Goal:** Make the AI chat work end-to-end from the desktop app, through the orchestrator, to the FiveM agent.

---

## Architecture Overview

```
┌──────────────┐     HTTP/REST      ┌─────────────────┐     WebSocket      ┌──────────────┐
│  React UI    │ ────────────────→  │  Orchestrator   │ ─────────────────→  │  Tauri Agent │
│  (Tauri)     │   /api/threads/    │  (Fastify:3001) │    /ws/agent       │  (Rust)      │
│              │ ←────────────────  │                  │ ←────────────────  │              │
│  Chat Input  │     Streaming      │  AI (OmniRoute)  │   Commands/Results │  FiveM Ctrl  │
└──────────────┘                    └────────┬────────┘                    └──────────────┘
                                             │
                                     HTTP /chat/completions
                                             │
                                      localhost:20128
                                             │
                                      OmniRoute (643 models)
```

**Current State:**
- ✅ OmniRoute running on `localhost:20128` (643 models, `auto/best-coding` available)
- ✅ PostgreSQL running, database `fivem_dev` exists, schema in sync
- ✅ Prisma client generates successfully
- ❌ Orchestrator not running (no `.env` file)
- ❌ Tauri app chat uses HTTP, not WebSocket agent protocol
- ❌ Vite rewrites Clerk JS paths in production build
- ❌ Authorization header corrupted (`***` instead of backtick template literal)

---

## Phase 0 — Immediate Fixes (30 min)

### 0.1 Create orchestrator `.env` file
```bash
DATABASE_URL="postgresql://postgres:***@@@localhost:5432/fivem_dev"
DIRECT_URL="postgresql://postgres:***@@@localhost:5432/fivem_dev"
ORCHESTRATOR_PORT=3001
CORS_ORIGINS="http://localhost:3000,http://localhost:1420"
JWT_SECRET="v7Kq9X2mL8pR4zN6cT1wY5hF3sJ0aB8dE6uG9xP2"
CLERK_JWKS_DOMAIN="relevant-ram-9120.clerk.accounts.dev"
CLERK_JWT_AUDIENCE=""
```

### 0.2 Fix `api.ts` Authorization header
```typescript
// Current (BROKEN):
return { 'Content-Type': 'application/json', Authorization: *** ${token}` }

// Fixed:
return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
```

### 0.3 Start orchestrator
```bash
cd D:/fivem-dev/apps/orchestrator
pnpm dev
# Verify: curl http://localhost:3001/health
```

### 0.4 Test chat endpoint (no auth needed for public paths)
```bash
curl -X POST http://localhost:3001/api/threads/thread_test/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hello","userId":"test-user"}'
```

**Expected result:** AI responds with a chat message via OmniRoute.

---

## Phase 1 — Core AI Chat (2 hours)

### 1.1 Verify OmniRoute integration works
The orchestrator already has:
- `src/claude/session.ts` — OpenAI SDK client pointing to `http://localhost:20128/v1`
- `src/chat/chatService.ts` — Handles chat flow with tool calls
- `src/chat/routes.ts` — HTTP endpoint `/api/threads/:threadId/chat`

**Test the AI directly:**
```bash
curl -X POST http://localhost:20128/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto/best-coding",
    "messages": [{"role": "user", "content": "Say hello in 5 words"}],
    "stream": false
  }'
```

If this works, the AI integration is solid.

### 1.2 Fix the Tauri app to call the orchestrator correctly

**Problem:** The Tauri app's `api.ts` calls the orchestrator but:
1. The auth header may fail if no Clerk token (development mode should work without)
2. The chat endpoint requires a valid thread with a server

**Fix:** Update `api.ts` to handle dev mode (no auth) and ensure thread creation works:

```typescript
// In api.ts, update authHeaders:
function authHeaders(): Record<string, string> {
  const token = getClerkToken()
  if (token) {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  }
  // Dev mode: no auth header (public paths allow this)
  return { 'Content-Type': 'application/json' }
}
```

### 1.3 Verify the chat flow end-to-end

**Step-by-step test:**
1. Create a server: `POST /api/servers` → `{ server: { id }, pairing: { code } }`
2. Send chat: `POST /api/threads/thread_{serverId}/chat` → `{ threadId, response }`
3. The orchestrator will:
   - Auto-create the thread (it already does this)
   - Call OmniRoute with system prompt + messages
   - Stream back text chunks
   - Handle tool calls if needed

**If step 3 fails**, check:
- Orchestrator logs for AI errors
- OmniRoute availability: `curl http://localhost:20128/v1/models`
- Database connection: `docker exec fivem-dev-db psql -U postgres -c "SELECT 1"`

---

## Phase 2 — WebSocket Agent Integration (3 hours)

### 2.1 Understand the dual architecture

The system has TWO chat paths:
1. **HTTP path** (React → Orchestrator → AI) — already works if orchestrator runs
2. **WebSocket path** (Tauri Agent → Orchestrator → AI) — for direct FiveM control

The Tauri Rust code in `agent.rs` implements path #2, but the React frontend never uses it.

### 2.2 Bridge React to Tauri agent commands

**Option A: Keep HTTP chat (simpler, already works)**
- Use the existing `sendChatMessage()` in `api.ts`
- Tool calls go through `agentGateway.sendCommand()` on the orchestrator side
- The Tauri agent connects separately via WebSocket for file operations

**Option B: Use Tauri agent for everything (more complex)**
- React calls `send_chat_message_cmd` Tauri command
- Rust connects to WebSocket, sends chat request
- Orchestrator processes through AI, returns response

**Recommendation: Start with Option A**, then add Option B later.

### 2.3 Implement Tauri agent connection

**In `agent.rs` (Rust side):**
```rust
// Already exists: connect_agent_cmd(server_id)
// Just needs to be called from React

#[tauri::command]
pub async fn connect_agent_cmd(server_id: String) -> Result<AgentState, String> {
    // Connects to ws://orchestrator:3001/ws/agent
    // Sends agent.hello with capabilities
    // Waits for agent.authenticated response
}
```

**In React (`useAgentConnection.ts` — new hook):**
```typescript
export function useAgentConnection(serverId: string) {
  const [state, setState] = useState<AgentState>({
    connected: false,
    serverId: null,
    status: 'disconnected'
  })

  const connect = async () => {
    const result = await invoke('connect_agent_cmd', { serverId })
    setState(result)
  }

  const disconnect = async () => {
    await invoke('disconnect_agent_cmd')
    setState({ connected: false, serverId: null, status: 'disconnected' })
  }

  return { state, connect, disconnect }
}
```

### 2.4 Wire up the agent status in the UI

**Update `Layout.tsx`:**
```typescript
// Replace the simple auth check with agent connection status
const { state: agentState, connect: connectAgent } = useAgentConnection(currentServerId)

// In header:
<div className="flex items-center gap-2">
  <div className={`w-1.5 h-1.5 ${agentState.connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
  <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]">
    {agentState.connected ? 'Agent Online' : 'Agent Offline'}
  </span>
</div>
```

---

## Phase 3 — Vite Build Fix (1 hour)

### 3.1 Problem: Clerk JS path rewriting

Vite rewrites `/clerk.browser.js` to `/assets/clerk.browser-XXX.js` in production builds.
The Clerk JS code dynamically loads chunks like `/framework_clerk.browser_XXX.js`.
If paths are rewritten, chunk loading fails.

### 3.2 Solution: Preserve original paths

**Update `vite.config.ts`:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'TAURI_'],
  server: { port: 1420 },
  build: {
    rollupOptions: {
      output: {
        // Preserve original filenames for Clerk JS
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.includes('clerk')) {
            return 'assets/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
```

### 3.3 Copy Clerk chunks to build output

**Add a post-build script:**
```javascript
// postbuild.mjs
import { copyFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = `${__dirname}/public`
const distDir = `${__dirname}/dist`

// Copy Clerk JS files to dist
const clerkFiles = [
  'clerk.browser.js',
  'framework_clerk.browser_0cc2cca54d.js',
  'ui-common_clerk.browser_0cc2cc_5.127.2.js',
  // ... all other chunks
]

mkdirSync(`${distDir}/assets`, { recursive: true })
for (const file of clerkFiles) {
  const src = `${publicDir}/${file}`
  const dest = `${distDir}/assets/${file}`
  copyFileSync(src, dest)
}
```

**Update `package.json`:**
```json
{
  "scripts": {
    "build": "tsc && vite build && node postbuild.mjs",
    "tauri:build": "tauri build"
  }
}
```

### 3.4 Update `index.html` for production

```html
<!-- During dev, load from /clerk.browser.js (served by Vite) -->
<!-- During production, Vite will resolve this to the assets/ path -->
<script src="/clerk.browser.js" crossorigin="anonymous"></script>
```

Vite's dev server serves `public/` files directly. The production build needs the postbuild script to copy them.

---

## Phase 4 — End-to-End Test (1 hour)

### 4.1 Manual test flow

```bash
# 1. Start services
docker start fivem-dev-db  # if stopped
cd D:/fivem-dev/apps/orchestrator && pnpm dev
cd D:/fivem-dev/apps/tauri-agent && pnpm tauri dev

# 2. In the app:
# - Sign in with Clerk (or skip if in dev mode)
# - Click "Create Server"
# - Note the pairing code
# - In Chat tab, select a skill (e.g., "Error Fixer")
# - Send: "Fix this error: attempt to index a nil value (field '?')"

# 3. Expected:
# - Orchestrator receives the message
# - AI analyzes the error using OmniRoute
# - AI responds with analysis and possible fix
# - If tool call needed, orchestrator sends command to agent
```

### 4.2 Debugging checklist

| Symptom | Check |
|---------|-------|
| White screen on launch | Check browser console for Clerk errors |
| "Failed to send message" | Check if orchestrator is running on :3001 |
| 401 Unauthorized | Check if auth header is correct |
| AI returns empty response | Check OmniRoute is reachable on :20128 |
| Tool calls fail | Check if agent is connected via WebSocket |
| Chat history not saved | Check localStorage is accessible |

### 4.3 Log endpoints to monitor

```
Orchestrator: http://localhost:3001/health
OmniRoute:    http://localhost:20128/v1/models
Database:     docker exec fivem-dev-db psql -U postgres -c "SELECT count(*) FROM servers;"
```

---

## Phase 5 — Advanced Features (optional)

### 5.1 Real-time streaming in React

**Current:** HTTP POST, waits for full response
**Better:** SSE or WebSocket for real-time chunks

**Update `chatService.ts`:**
```typescript
// Return a readable stream instead of waiting
export async function* streamChatResponse(
  threadId: string,
  message: string,
  userId: string
): AsyncGenerator<{ type: 'text' | 'tool_use' | 'error', content: string }> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/threads/${threadId}/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message, userId }),
  })
  
  // If orchestrator supports SSE, parse the stream
  // Otherwise, wait for full response
  const data = await res.json()
  yield { type: 'text', content: data.response }
}
```

### 5.2 Tool call visualization

**In `Chat.tsx`, add tool call display:**
```typescript
{message.toolCalls?.map(tc => (
  <div key={tc.id} className="mt-2 p-2 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.3)] rounded">
    <span className="font-mono text-xs text-[#5E6AD2]">{tc.name}</span>
    <pre className="text-[10px] text-[rgba(255,255,255,0.5)] mt-1">
      {JSON.stringify(tc.arguments, null, 2)}
    </pre>
    {tc.result && (
      <div className="mt-1 text-[10px] text-green-400">
        ✓ {JSON.stringify(tc.result).slice(0, 100)}...
      </div>
    )}
  </div>
))}
```

### 5.3 Agent pairing flow

**In Dashboard, add "Connect Agent" button:**
```typescript
const handleConnectAgent = async (serverId: string) => {
  const pairingCode = prompt('Enter pairing code from your FiveM server:')
  if (!pairingCode) return
  
  // Call Tauri command to connect agent
  await invoke('connect_agent_cmd', { serverId })
  // Refresh server list to show agent connected
  await loadServers()
}
```

---

## File Change Summary

| File | Change | Priority |
|------|--------|----------|
| `apps/orchestrator/.env` | Create with DATABASE_URL, CORS, JWT | Critical |
| `apps/tauri-agent/src/api.ts` | Fix Authorization header | Critical |
| `apps/tauri-agent/vite.config.ts` | Add assetFileNames config | High |
| `apps/tauri-agent/postbuild.mjs` | New: copy Clerk chunks to dist | High |
| `apps/tauri-agent/src/hooks/useAgentConnection.ts` | New: Tauri agent WebSocket hook | Medium |
| `apps/tauri-agent/src/pages/Chat.tsx` | Add tool call display | Medium |
| `apps/tauri-agent/src/components/Layout.tsx` | Add agent connection status | Medium |

---

## Quick Start Commands

```bash
# 1. Ensure PostgreSQL is running
docker ps | grep postgres

# 2. Generate Prisma client (if needed)
cd D:/fivem-dev/packages/db && pnpm prisma generate

# 3. Create orchestrator .env
cat > D:/fivem-dev/apps/orchestrator/.env << 'EOF'
DATABASE_URL="postgresql://postgres:***@@@localhost:5432/fivem_dev"
DIRECT_URL="postgresql://postgres:***@@@localhost:5432/fivem_dev"
ORCHESTRATOR_PORT=3001
CORS_ORIGINS="http://localhost:3000,http://localhost:1420"
JWT_SECRET="v7Kq9X2mL8pR4zN6cT1wY5hF3sJ0aB8dE6uG9xP2"
CLERK_JWKS_DOMAIN="relevant-ram-9120.clerk.accounts.dev"
CLERK_JWT_AUDIENCE=""
EOF

# 4. Start orchestrator
cd D:/fivem-dev/apps/orchestrator && pnpm dev

# 5. In another terminal, start Tauri
cd D:/fivem-dev/apps/tauri-agent && pnpm tauri dev

# 6. Test AI directly
curl -X POST http://localhost:20128/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"auto/best-coding","messages":[{"role":"user","content":"Hi"}]}'
```
