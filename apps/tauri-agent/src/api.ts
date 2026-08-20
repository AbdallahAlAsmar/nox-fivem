// Desktop app API — talks directly to the orchestrator HTTP API
// Uses Clerk session token for auth when available

// The orchestrator runs on VPS (Oracle 158.101.167.118:3001)
// Override at build time with VITE_ORCHESTRATOR_URL env var
const ORCHESTRATOR_URL = import.meta.env?.VITE_ORCHESTRATOR_URL
  || 'http://158.101.167.118:3001'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Server {
  id: string
  name: string
  directory?: string
  framework?: string
  status: 'online' | 'offline' | 'connecting' | 'unpaired'
  lastSeenAt?: string | null
  resourceCount: number
  hasAgent: boolean
  playerCount: number
  maxPlayers: number
  fps: number
  pairingCode?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  skillUsed?: string
  isError?: boolean
}

export interface PairingResult {
  code: string
  server: Server
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${ORCHESTRATOR_URL}${path.startsWith('/') ? '' : '/'}${path}`
  const token = (window as any).__nox_clerk_token as string | undefined
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Servers ─────────────────────────────────────────────────────────────────

export async function fetchServers(): Promise<Server[]> {
  try {
    return await apiFetch('/api/servers')
  } catch {
    return []
  }
}

export async function fetchServer(serverId: string): Promise<Server | null> {
  try {
    return await apiFetch(`/api/servers/${serverId}`)
  } catch {
    return null
  }
}

export async function createServer(name: string, directory?: string): Promise<Server & { pairingCode: string }> {
  return apiFetch('/api/servers', {
    method: 'POST',
    body: JSON.stringify({ name, directory }),
  })
}

export async function autoPairServer(name: string, directory: string): Promise<{ id: string; pairingCode: string }> {
  const result = await createServer(name, directory)
  return { id: result.id, pairingCode: result.pairingCode }
}

export async function startServer(serverId: string): Promise<any> {
  return apiFetch(`/api/servers/${serverId}/start`, { method: 'POST' })
}

export async function stopServer(serverId: string): Promise<any> {
  return apiFetch(`/api/servers/${serverId}/stop`, { method: 'POST' })
}

export async function regeneratePairing(serverId: string): Promise<{ code: string }> {
  return apiFetch(`/api/servers/${serverId}/pairing/regenerate`, { method: 'POST' })
}

export async function scanResources(serverId: string): Promise<any> {
  return apiFetch(`/api/servers/${serverId}/scan`, { method: 'POST' })
}

export async function restartServer(serverId: string): Promise<any> {
  return apiFetch(`/api/servers/${serverId}/restart`, { method: 'POST' })
}

// ─── Changes ─────────────────────────────────────────────────────────────────

export async function fetchChanges(serverId?: string): Promise<any[]> {
  try {
    const url = serverId
      ? `/api/changes?serverId=${serverId}&limit=100`
      : '/api/changes?limit=100'
    return await apiFetch(url)
  } catch {
    return []
  }
}

export async function applyChange(changeId: string): Promise<any> {
  return apiFetch(`/api/changes/${changeId}/apply`, { method: 'POST' })
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export async function sendChatMessage(serverId: string, message: string): Promise<string> {
  const threadId = serverId === 'local' ? 'thread_local' : `thread_${serverId}`
  const result = await apiFetch(`/api/threads/${threadId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
  return result?.response ?? result?.message ?? 'Response received.'
}

export function getStoredMessages(serverId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(`chat_${serverId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function storeMessages(serverId: string, messages: ChatMessage[]): void {
  localStorage.setItem(`chat_${serverId}`, JSON.stringify(messages))
}

// ─── Players ─────────────────────────────────────────────────────────────────

export async function fetchPlayers(serverId: string): Promise<any[]> {
  try {
    return await apiFetch(`/api/servers/${serverId}/players`)
  } catch {
    return []
  }
}

export async function banPlayer(serverId: string, playerId: string, reason?: string): Promise<any> {
  return apiFetch(`/api/servers/${serverId}/players/${playerId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function unbanPlayer(serverId: string, playerId: string): Promise<any> {
  return apiFetch(`/api/servers/${serverId}/players/${playerId}/unban`, {
    method: 'POST',
  })
}

// ─── Resources ───────────────────────────────────────────────────────────────

export async function fetchServerResources(serverId: string): Promise<any[]> {
  try {
    return await apiFetch(`/api/servers/${serverId}/resources`)
  } catch {
    return []
  }
}

// ─── Org / Billing ───────────────────────────────────────────────────────────

export async function fetchOrg(): Promise<any> {
  try {
    return await apiFetch('/api/org')
  } catch {
    return null
  }
}
