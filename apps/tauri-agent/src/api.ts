// Desktop app API — talks directly to the orchestrator HTTP API
// Uses Clerk session token for auth when available

// The orchestrator runs on VPS (Oracle 158.101.167.118) via Cloudflare tunnel
// Override at build time with VITE_ORCHESTRATOR_URL env var
const ORCHESTRATOR_URL = import.meta.env?.VITE_ORCHESTRATOR_URL
  || 'https://gazette-hurricane-hung-calibration.trycloudflare.com'

// ─── Clerk auth helpers ────────────────────────────────────────────────────────

// In a Tauri app, Clerk is loaded via script tag. We access it from window.
declare global {
  interface Window {
    __nox_clerk_token?: string | null
    __nox_clerk_user?: { id: string; email: string; name: string } | null
  }
}

export function getClerkToken(): string | null {
  return window.__nox_clerk_token || null
}

export function getClerkUser() {
  return window.__nox_clerk_user || null
}

function authHeaders(): Record<string, string> {
  const token = getClerkToken()
  if (token) {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  }
  return { 'Content-Type': 'application/json' }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Server {
  id: string
  name: string
  status: string
  framework: string
  hasAgent: boolean
  pairingCode?: string
  directory?: string
  resourceCount: number
  playerCount: number
  maxPlayers: number
  fps: number
  lastSeenAt?: string
}

export interface ServerDetail {
  id: string
  name: string
  framework: string
  status: string
  lastSeenAt: string | null
  lastScanAt: string | null
  playerCount: number
  maxPlayers: number
  fps: number
  resourceCount: number
  hasAgent: boolean
  pairing: { code: string; expiresAt: Date } | null
  resources?: Array<{ name: string; path: string; dependencies?: string[] }>
}

// ─── Server CRUD ───────────────────────────────────────────────────────────────

export async function fetchServers(): Promise<Server[]> {
  try {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/servers`, {
      headers: authHeaders(),
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function createServer(
  name: string,
  directory?: string,
): Promise<{ id: string; pairingCode: string }> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/servers`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, directory }),
  })
  if (!res.ok) throw new Error(`Failed to create server: ${res.status}`)
  const data = await res.json()
  return { id: data.server.id, pairingCode: data.pairing.code }
}

export async function autoPairServer(
  name: string,
  directory: string,
): Promise<{ id: string }> {
  // Create server and immediately claim pairing in one flow
  const res = await fetch(`${ORCHESTRATOR_URL}/api/servers`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, directory }),
  })
  if (!res.ok) throw new Error(`Failed to create server: ${res.status}`)
  const data = await res.json()
  const pairingCode = data.pairing.code

  // Immediately claim the pairing
  const claimRes = await fetch(`${ORCHESTRATOR_URL}/api/pairing/claim`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      pairingCode: pairingCode.toUpperCase(),
      agentVersion: '1.0.0',
      platform: 'windows',
      rootLabel: directory,
    }),
  })
  if (!claimRes.ok) {
    // Server was created but pairing failed — return id anyway so user can retry
    return { id: data.server.id }
  }
  return { id: data.server.id }
}

export async function fetchServerDetail(
  serverId: string,
): Promise<ServerDetail | null> {
  try {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/servers/${serverId}`, {
      headers: authHeaders(),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function regeneratePairing(serverId: string): Promise<{
  code: string
  expiresAt: Date
}> {
  const res = await fetch(
    `${ORCHESTRATOR_URL}/api/servers/${serverId}/pairing`,
    { method: 'POST', headers: authHeaders() },
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error || `HTTP ${res.status}`)
  }
  const data = await res.json()
  return data.pairing
}

// ─── Chat ──────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  skillUsed?: string
  isError?: boolean
}

const STORAGE_KEY = (serverId: string) => `chat_${serverId}`

function loadMessages(serverId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(serverId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveMessages(serverId: string, msgs: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY(serverId), JSON.stringify(msgs.slice(-100)))
  } catch { /* quota */ }
}

export async function sendChatMessage(serverId: string, message: string): Promise<string> {
  const threadId = `thread_${serverId}`
  const user = getClerkUser()
  const userId = user?.id || 'anonymous'

  const userMsg: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: message,
    timestamp: Date.now(),
  }
  const updated = [...loadMessages(serverId), userMsg]
  saveMessages(serverId, updated)

  try {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/threads/${threadId}/chat`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ message, userId }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: data?.response || 'Response received.',
      timestamp: Date.now(),
    }
    const final = [...updated, assistantMsg]
    saveMessages(serverId, final)
    return data?.response || assistantMsg.content
  } catch (err) {
    const errMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Sorry, there was an error: ${err instanceof Error ? err.message : String(err)}`,
      timestamp: Date.now(),
      isError: true,
    }
    const final = [...updated, errMsg]
    saveMessages(serverId, final)
    throw err
  }
}

export function loadChatMessages(serverId: string): ChatMessage[] {
  return loadMessages(serverId)
}

export function getStoredMessages(serverId: string): ChatMessage[] {
  return loadMessages(serverId)
}

export function storeMessages(serverId: string, msgs: ChatMessage[]): void {
  saveMessages(serverId, msgs)
}

export function clearChatMessages(serverId: string) {
  localStorage.removeItem(STORAGE_KEY(serverId))
}

// ─── Changes ───────────────────────────────────────────────────────────────────

export interface Change {
  id: string
  serverId: string
  serverName: string
  file: string
  diff: string
  status: 'pending' | 'applied' | 'rejected'
  createdAt: string
}

export async function fetchChanges(serverId?: string): Promise<Change[]> {
  try {
    const url = serverId
      ? `${ORCHESTRATOR_URL}/api/servers/${serverId}/changes`
      : `${ORCHESTRATOR_URL}/api/changes?limit=100`
    const res = await fetch(url, { headers: authHeaders() })
    if (!res.ok) return []
    const data = await res.json()
    return data.changes || data
  } catch {
    return []
  }
}

export async function applyChange(changeId: string): Promise<any> {
  const res = await fetch(
    `${ORCHESTRATOR_URL}/api/changes/${changeId}/apply`,
    { method: 'POST', headers: authHeaders() },
  )
  if (!res.ok) throw new Error(`Failed to apply change: ${res.status}`)
  return res.json()
}

// ─── Resources ─────────────────────────────────────────────────────────────────

export async function scanResources(serverId: string): Promise<any> {
  const res = await fetch(
    `${ORCHESTRATOR_URL}/api/servers/${serverId}/scan`,
    { method: 'POST', headers: authHeaders() },
  )
  if (!res.ok) throw new Error(`Failed to scan resources: ${res.status}`)
  return res.json()
}

// ─── Player Management ────────────────────────────────────────────────────────

export async function fetchPlayers(serverId: string): Promise<any[]> {
  try {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/servers/${serverId}/players`, {
      headers: authHeaders(),
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function banPlayer(
  serverId: string,
  playerId: string,
  reason?: string,
): Promise<any> {
  const res = await fetch(
    `${ORCHESTRATOR_URL}/api/servers/${serverId}/players/${playerId}/ban`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ reason }),
    },
  )
  if (!res.ok) throw new Error(`Failed to ban player: ${res.status}`)
  return res.json()
}

export async function unbanPlayer(
  serverId: string,
  playerId: string,
): Promise<any> {
  const res = await fetch(
    `${ORCHESTRATOR_URL}/api/servers/${serverId}/players/${playerId}/unban`,
    { method: 'POST', headers: authHeaders() },
  )
  if (!res.ok) throw new Error(`Failed to unban player: ${res.status}`)
  return res.json()
}

// ─── Server Control ────────────────────────────────────────────────────────────

export async function startServer(serverId: string): Promise<any> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/servers/${serverId}/start`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Failed to start server: ${res.status}`)
  return res.json()
}

export async function stopServer(serverId: string): Promise<any> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/servers/${serverId}/stop`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Failed to stop server: ${res.status}`)
  return res.json()
}

export async function restartServer(serverId: string): Promise<any> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/servers/${serverId}/restart`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Failed to restart server: ${res.status}`)
  return res.json()
}
