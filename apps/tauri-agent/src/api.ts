// Desktop app API — talks directly to the orchestrator HTTP API
// Uses Clerk session token for auth when available

// The orchestrator runs on localhost:3001 (web app uses 3000)
// Override at build time with VITE_ORCHESTRATOR_URL env var
const ORCHESTRATOR_URL = import.meta.env?.VITE_ORCHESTRATOR_URL
  || 'http://localhost:3001'

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

// ─── Server CRUD ───────────────────────────────────────────────────────────────

export interface Server {
  id: string
  name: string
  status: string
  framework: string
  hasAgent: boolean
  pairingCode?: string
}

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

export async function createServer(name: string): Promise<{ id: string; pairingCode: string }> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/servers`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`Failed to create server: ${res.status}`)
  const data = await res.json()
  return { id: data.server.id, pairingCode: data.pairing.code }
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

  const res = await fetch(`${ORCHESTRATOR_URL}/api/threads/${threadId}/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message, userId }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to send message: ${res.status} ${text}`)
  }
  const data = await res.json()
  return data.response || ''
}

export function getStoredMessages(serverId: string): ChatMessage[] {
  return loadMessages(serverId)
}

export function storeMessages(serverId: string, msgs: ChatMessage[]) {
  saveMessages(serverId, msgs)
}

// ─── Changes ───────────────────────────────────────────────────────────────────

export async function fetchChanges(serverId: string) {
  try {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/servers/${serverId}/changes`, {
      headers: authHeaders(),
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

// ─── Scan ──────────────────────────────────────────────────────────────────────

export async function scanResources(serverId: string) {
  try {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/servers/${serverId}/scan`, {
      method: 'POST',
      headers: authHeaders(),
    })
    if (!res.ok) throw new Error(`Scan failed: ${res.status}`)
    return res.json()
  } catch (e) {
    console.error('Scan error:', e)
    throw e
  }
}
