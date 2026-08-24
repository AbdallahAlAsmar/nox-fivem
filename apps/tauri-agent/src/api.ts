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

export async function claimPairing(
  pairingCode: string,
  directory: string,
): Promise<{ serverId: string; agentDeviceId: string; wsUrl: string }> {
  return apiFetch('/api/pairing/claim', {
    method: 'POST',
    body: JSON.stringify({
      pairingCode: pairingCode.toUpperCase(),
      agentVersion: '0.1.0',
      platform: 'windows',
      rootLabel: directory,
    }),
  })
}

export async function autoPairServer(
  name: string,
  directory: string,
): Promise<{ id: string; agentDeviceId: string; pairingCode: string }> {
  const result = await createServer(name, directory)
  const pairingCode = result.pairingCode
  if (!pairingCode) {
    throw new Error('No pairing code returned from server creation')
  }
  const claim = await claimPairing(pairingCode, directory)
  return { id: claim.serverId, agentDeviceId: claim.agentDeviceId, pairingCode }
}

export async function startServer(serverId: string): Promise<any> {
  return apiFetch(`/api/servers/${serverId}/start`, { method: 'POST' })
}

export async function stopServer(serverId: string): Promise<any> {
  return apiFetch(`/api/servers/${serverId}/stop`, { method: 'POST' })
}

export async function getPairingCode(serverId: string): Promise<{ code: string; expiresAt: string }> {
  const data = await apiFetch(`/api/servers/${serverId}/pairing`, { method: 'POST' })
  return data.pairing
}

export async function regeneratePairing(serverId: string): Promise<{ code: string; expiresAt: string }> {
  return getPairingCode(serverId)
}

export async function connectExistingServer(
  serverId: string,
  directory: string,
): Promise<{ serverId: string; agentDeviceId: string }> {
  // 1. Fetch server details from orchestrator
  const details = await apiFetch(`/api/servers/${serverId}`)

  // 2. If already paired, use existing paired agent device ID directly
  if (details?.agent?.id) {
    return { serverId, agentDeviceId: details.agent.id }
  }

  // 3. If there is an active pairing code, claim it
  if (details?.pairing?.code) {
    const claim = await claimPairing(details.pairing.code, directory)
    return { serverId: claim.serverId, agentDeviceId: claim.agentDeviceId }
  }

  // 4. Otherwise request a new pairing code and claim it
  try {
    const pairing = await getPairingCode(serverId)
    if (pairing?.code) {
      const claim = await claimPairing(pairing.code, directory)
      return { serverId: claim.serverId, agentDeviceId: claim.agentDeviceId }
    }
  } catch (err) {
    console.warn('Pairing code request note:', err)
  }

  throw new Error('Unable to obtain agent device credentials for this server')
}

export async function scanResources(serverId: string): Promise<any> {
  return apiFetch(`/api/servers/${serverId}/scan`, { method: 'POST' })
}

export async function syncResources(
  serverId: string,
  data: { framework?: string; resources: any[] }
): Promise<any> {
  const formattedResources = (data.resources || []).map((r: any) => ({
    name: r.name,
    relativePath: r.relativePath || r.relative_path || '',
    manifestPath: r.manifestPath || r.manifest_path || '',
    dependencies: r.dependencies || r.manifest?.dependencies || [],
    provides: r.provides || r.manifest?.provides || [],
    files: r.files || [],
  }))

  return apiFetch(`/api/servers/${serverId}/resources/sync`, {
    method: 'POST',
    body: JSON.stringify({
      framework: data.framework || 'unknown',
      resources: formattedResources,
    }),
  }).catch((e) => {
    console.warn('Direct resource sync note:', e)
  })
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

/**
 * Apply every pending change for a server, one at a time, so each change gets
 * a real git-checkpointed apply on the agent (the orchestrator's batch/apply
 * endpoint only flips DB status without touching files — not used here).
 * Returns per-change outcomes; never throws.
 */
export async function applyAllChanges(
  serverId: string,
): Promise<{ applied: string[]; failed: Array<{ id: string; error: string }> }> {
  const pending = await fetchChanges(serverId)
  const applied: string[] = []
  const failed: Array<{ id: string; error: string }> = []
  for (const change of pending) {
    if (change.status !== 'pending') continue
    try {
      await applyChange(change.id)
      applied.push(change.id)
    } catch (e) {
      failed.push({ id: change.id, error: e instanceof Error ? e.message : String(e) })
    }
  }
  return { applied, failed }
}

export async function applyChange(changeId: string): Promise<any> {
  return apiFetch(`/api/changes/${changeId}/apply`, { method: 'POST' })
}

/** Cancel (discard) a pending change — orchestrator marks it rolled_back. */
export async function cancelChange(changeId: string): Promise<any> {
  return apiFetch(`/api/changes/${changeId}/cancel`, { method: 'POST' })
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  skillUsed?: string
  isError?: boolean
}

export async function sendChatMessage(threadId: string, message: string): Promise<string> {
  const result = await apiFetch(`/api/threads/${threadId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message, userId: 'tauri' }),
  })
  return result?.response ?? result?.message ?? 'Response received.'
}

export async function fetchServerThread(serverId: string): Promise<{ id: string; messages: any[] } | null> {
  try {
    return await apiFetch(`/api/servers/${serverId}/thread`)
  } catch {
    return null
  }
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
