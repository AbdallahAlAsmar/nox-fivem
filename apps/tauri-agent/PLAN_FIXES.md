# NOX Desktop App — Fix Plan

**Status:** All fixes applied in this session (Vite port, CORS, Bearer token, Clerk JS local, isError type)
**Remaining:** 8 improvements to implement

---

## Phase 1 — Core Fixes (blocking functionality)

### 1.1 Fix Vite Clerk JS path rewriting
**Problem:** Vite rewrites `/clerk.browser.js` → `/assets/clerk.browser-XXX.js` in production, breaking Clerk chunk loading.

**Steps:**
1. Add a Vite plugin to rewrite Clerk paths back to `/assets/` prefix
2. Or configure `vite.config.ts` with `build.rollupOptions.output.assetFileNames` to preserve original names
3. Copy all Clerk chunks to `dist/assets/` during build
4. Update `index.html` to use dynamic script loading that works in both dev and production

**Files:**
- `apps/tauri-agent/vite.config.ts`
- `apps/tauri-agent/index.html`
- `apps/tauri-agent/public/` (keep as-is for dev, add build hook for prod)

**Priority:** Critical — breaks auth in production builds

---

### 1.2 Fix orchestrator — get it running
**Problem:** Orchestrator isn't running. Missing `DATABASE_URL`, Supabase connection may be paused.

**Steps:**
1. Verify PostgreSQL container is running: `docker ps | grep postgres`
2. Check database exists: `docker exec fivem-dev-db psql -U postgres -l`
3. If database doesn't exist, create it: `docker exec -i fivem-dev-db psql -U postgres -c "CREATE DATABASE fivem_dev;"`
4. Set `DATABASE_URL` in orchestrator's `.env`:
   ```
   DATABASE_URL="postgresql://postgres:***@@@localhost:5432/fivem_dev"
   ```
5. Run Prisma migrations: `cd apps/orchestrator && pnpm prisma migrate deploy`
6. Start orchestrator: `cd apps/orchestrator && pnpm dev`
7. Verify: `curl http://localhost:3001/health`

**Files:**
- `apps/orchestrator/.env`
- `apps/orchestrator/src/config/index.ts`

**Priority:** Critical — nothing works without the orchestrator

---

### 1.3 Fix Clerk auth flow — make it robust
**Problem:** Relies on raw `Clerk` global, breaks if CDN is blocked or Clerk JS fails to load.

**Steps:**
1. Create `useClerkAuth` hook that:
   - Loads Clerk JS dynamically if not present
   - Waits for `Clerk.load()` to complete
   - Falls back to localStorage token if Clerk fails
2. Add Clerk error boundary with recovery UI
3. Handle `publishableKey` properly — decode from base64 if needed
4. Add `setPublishableKey()` call before any Clerk components render

**Files:**
- `apps/tauri-agent/src/contexts/ClerkContext.tsx`
- `apps/tauri-agent/src/hooks/useClerkAuth.ts` (new)
- `apps/tauri-agent/src/components/ErrorBoundary.tsx`

**Priority:** High — auth is the first thing users see

---

## Phase 2 — Feature Parity (desktop should match web)

### 2.1 Implement WebSocket chat streaming
**Problem:** Desktop uses HTTP POST for chat, ignores the WebSocket agent gateway. Tauri Rust side has `send_chat_message_cmd` but React never calls it.

**Steps:**
1. Create `useAgentWebSocket` hook in React:
   ```typescript
   const ws = useAgentWebSocket({
     url: config.orchestratorUrl,
     serverId: currentServerId,
     onMessage: (msg) => setMessages(prev => [...prev, msg])
   })
   ```
2. Bridge Tauri commands to React state:
   - `connect_agent_cmd` → track connection state
   - `send_chat_message_cmd` → send messages, receive streaming responses
   - `get_agent_state_cmd` → poll for status
3. Update `Chat.tsx` to use the WebSocket hook instead of `sendChatMessage` from `api.ts`
4. Add tool call display in chat UI (use existing `ChatResponse.tool_calls`)

**Files:**
- `apps/tauri-agent/src/hooks/useAgentWebSocket.ts` (new)
- `apps/tauri-agent/src/pages/Chat.tsx`
- `apps/tauri-agent/src/components/ToolCallDisplay.tsx` (new)

**Priority:** High — this is the main feature

---

### 2.2 Sync settings between desktop and orchestrator
**Problem:** Settings are localStorage-only. Orchestrator has its own config.

**Steps:**
1. Add settings API endpoint to orchestrator:
   - `GET /api/settings` — returns current config
   - `PUT /api/settings` — updates config
2. Update Tauri Rust `config.rs` to persist to file (JSON) instead of in-memory
3. On app boot, fetch settings from orchestrator, fall back to localStorage
4. On settings change, sync to orchestrator + localStorage

**Files:**
- `apps/orchestrator/src/http/routes.ts` (add settings routes)
- `apps/tauri-agent/src-tauri/src/config.rs`
- `apps/tauri-agent/src/pages/Settings.tsx`

**Priority:** Medium — nice to have for multi-device sync

---

### 2.3 Switch Rust to Tauri State pattern
**Problem:** Uses `lazy_static` globals instead of Tauri's `State` pattern. No devtools support, can't hot-reload.

**Steps:**
1. Create `ConfigStore` struct with `tauri::State`:
   ```rust
   #[derive(Clone)]
   struct ConfigStore {
     config: Arc<RwLock<Config>>,
     servers: Arc<RwLock<HashMap<String, Server>>>,
     agent_state: Arc<RwLock<AgentState>>,
   }
   ```
2. Update all commands to use `State<ConfigStore>` parameter
3. Register in `main.rs`:
   ```rust
   .manage(ConfigStore::default())
   ```
4. Add `/api/dev/state` endpoint for devtools inspection

**Files:**
- `apps/tauri-agent/src-tauri/src/config.rs`
- `apps/tauri-agent/src-tauri/src/main.rs`
- `apps/tauri-agent/src-tauri/src/commands/*.rs`

**Priority:** Medium — improves maintainability

---

## Phase 3 — UX Improvements

### 3.1 Add functional ErrorBoundary with recovery
**Problem:** Current error boundary is class-based, only catches render errors.

**Steps:**
1. Convert to functional component with `useCapture`:
   ```typescript
   function ErrorBoundary({ children }) {
     const [error, setError] = useState<Error | null>(null)
     return (
       <React.ErrorBoundary
         fallback={({ error, reset }) => <ErrorView error={error} onReset={reset} />}
       >
         {children}
       </React.ErrorBoundary>
     )
   }
   ```
2. Add API error boundary wrapper for async operations
3. Log errors to orchestrator for debugging

**Files:**
- `apps/tauri-agent/src/components/ErrorBoundary.tsx`
- `apps/tauri-agent/src/components/ApiErrorBoundary.tsx` (new)

**Priority:** Medium — improves reliability

---

### 3.2 Add DevTools integration
**Problem:** No React DevTools or Tauri Inspector connection.

**Steps:**
1. Enable devtools in `tauri.conf.json`:
   ```json
   "security": {
     "devPatterns": [".*"],
     "integrity": { "enabled": false }
   }
   ```
2. Add `@tauri-apps/plugin-shell` for `tauri::shell::open`
3. Add "Open DevTools" menu item in Settings
4. Enable React DevTools in build config

**Files:**
- `apps/tauri-agent/src-tauri/tauri.conf.json`
- `apps/tauri-agent/src/pages/Settings.tsx`

**Priority:** Low — dev-only feature

---

### 3.3 Add connection status indicator
**Problem:** No visual indicator of orchestrator connection status.

**Steps:**
1. Add `useOrchestratorHealth` hook:
   ```typescript
   const { connected, lastPing, error } = useOrchestratorHealth(orchestratorUrl)
   ```
2. Show status in Layout header (currently shows "Authed"/"Dev Mode")
3. Add retry logic with exponential backoff

**Files:**
- `apps/tauri-agent/src/hooks/useOrchestratorHealth.ts` (new)
- `apps/tauri-agent/src/components/Layout.tsx`

**Priority:** Low — improves UX feedback

---

## Phase 4 — Polish

### 4.1 Add loading skeletons
**Problem:** Pages show blank while loading data.

**Steps:**
1. Create `Skeleton` component
2. Add to Dashboard, Chat, Changes pages
3. Use `skeleton` class from Tailwind

**Files:**
- `apps/tauri-agent/src/components/Skeleton.tsx` (new)
- `apps/tauri-agent/src/pages/Dashboard.tsx`
- `apps/tauri-agent/src/pages/Chat.tsx`
- `apps/tauri-agent/src/pages/Changes.tsx`

**Priority:** Low — visual polish

---

### 4.2 Add keyboard shortcuts
**Problem:** Settings page lists shortcuts but they don't work.

**Steps:**
1. Implement `useKeyboardShortcuts` hook
2. Bind `Ctrl+K` → command palette
3. Bind `Ctrl+N` → new chat
4. Bind `Ctrl+R` → refresh servers
5. Bind `/` → search

**Files:**
- `apps/tauri-agent/src/hooks/useKeyboardShortcuts.ts` (new)
- `apps/tauri-agent/src/components/CommandPalette.tsx` (new)

**Priority:** Low — quality of life

---

### 4.3 Add offline support
**Problem:** App fails if orchestrator is unavailable.

**Steps:**
1. Cache last known state in localStorage
2. Show offline banner when orchestrator unreachable
3. Queue operations for retry when reconnected

**Files:**
- `apps/tauri-agent/src/hooks/useOffline.ts` (new)
- `apps/tauri-agent/src/components/OfflineBanner.tsx` (new)

**Priority:** Low — resilience improvement

---

## Implementation Order

```
Phase 1.1 (Vite Clerk paths) → Phase 1.2 (Orchestrator running) → Phase 1.3 (Clerk auth robust)
Phase 2.1 (WebSocket chat) → Phase 2.2 (Settings sync) → Phase 2.3 (Rust State)
Phase 3.1 (Error boundaries) → Phase 3.2 (DevTools) → Phase 3.3 (Connection status)
Phase 4.1 (Skeletons) → Phase 4.2 (Shortcuts) → Phase 4.3 (Offline)
```

## Estimated Effort

| Phase | Effort | Complexity |
|-------|--------|------------|
| 1 — Core Fixes | 4-6 hours | Medium |
| 2 — Feature Parity | 6-8 hours | High |
| 3 — UX Improvements | 3-4 hours | Low |
| 4 — Polish | 2-3 hours | Low |
| **Total** | **15-21 hours** | |

## Quick Wins (do these first)

1. **Fix Vite Clerk paths** — 30 min, blocks production builds
2. **Get orchestrator running** — 1 hour, enables everything
3. **Add connection status indicator** — 30 min, immediate UX improvement

Want me to start with Phase 1.1 (Vite Clerk paths)?
