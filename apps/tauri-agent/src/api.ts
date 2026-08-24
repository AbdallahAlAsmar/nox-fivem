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

// ─── Auth ────────────────────────────────────────────────────────────────────
//
// Clerk JWTs expire after ~60 seconds, so a token captured at login goes stale
// and every later request silently 401s. Instead of caching a token, the
// provider in App.tsx registers its Clerk getToken() here and the fetch
// wrapper below resolves a FRESH token for every request.

type TokenGetter = () => Promise<string | null | undefined>

let getTokenImpl: TokenGetter | null = null

/** Called once by the ClerkProvider wiring in App.tsx. */
export function setTokenGetter(getter: TokenGetter): void {
  getTokenImpl = getter
}

async function currentToken(): Promise<string | null | undefined> {
  try {
    return getTokenImpl ? await getTokenImpl() : null
  } catch {
    return null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${ORCHESTRATOR_URL}${path.startsWith('/') ? '' : '/'}${path}`
  const token = await currentToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Servers ─────────────────────────────────────────────────────────────────
//
// Read helpers PROPAGATE errors instead of silently returning empty data —
// callers render honest error states rather than fake "no servers" screens.

export async function fetchServers(): Promise<Server[]> {
  const data = await apiFetch('/api/servers')
  return Array.isArray(data) ? data : []
}

export async function fetchServer(serverId: string): Promise<Server> {
  return apiFetch(`/api/servers/${serverId}`)
}

export interface CreateServerResult {
  server: { id: string; name: string; status: string }
  connect: { serverId: string; agentDeviceId: string; wsUrl: string }
}

/**
 * Create a server. The orchestrator auto-creates a PAIRED agent device and
 * returns its id under `connect` (it never returns a pairing code).
 */
export async function createServer(name: string, directory?: string): Promise<CreateServerResult> {
  return apiFetch('/api/servers', {
    method: 'POST',
    body: JSON.stringify({ name, directory }),
  })
}

export async function claimPairing(
  pairingCode: string,
  directory: string,
): Promise<{ serverId: string; agentDeviceId: string; sessionToken?: string; wsUrl: string }> {
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

/**
 * Create a server ready for the desktop agent to connect. The orchestrator
 * auto-pairs the device at creation time — no separate pairing-code claim is
 * involved (that flow only applies to servers paired from the web dashboard).
 *
 * NOTE on tokens: POST /api/servers' `connect` payload carries ONLY
 * {serverId, agentDeviceId, wsUrl} — it does NOT issue a sessionToken (the
 * orchestrator mints tokens exclusively in POST /api/pairing/claim). A server
 * created through this path therefore has NO stored pairingTokenHash and its
 * device connects tokenless (accepted while AGENT_LEGACY_OK=true and the
 * stored hash is null). If the orchestrator later starts returning a token in
 * `connect`, capture it here.
 */
export async function createAndConnect(
  name: string,
  directory: string,
): Promise<{ id: string; agentDeviceId: string; sessionToken?: string }> {
  const result = await createServer(name, directory)
  const serverId = result.connect?.serverId || result.server?.id
  const agentDeviceId = result.connect?.agentDeviceId
  if (!serverId || !agentDeviceId) {
    throw new Error('Server created but no agent device was returned')
  }
  // Defensive: honor a token if the orchestrator ever adds one to `connect`.
  const sessionToken = (result.connect as { sessionToken?: string } | undefined)?.sessionToken
  return { id: serverId, agentDeviceId, sessionToken }
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
): Promise<{ serverId: string; agentDeviceId: string; sessionToken?: string }> {
  // 1. Fetch server details from orchestrator
  const details = await apiFetch(`/api/servers/${serverId}`)

  // 2. If already paired, use existing paired agent device ID directly.
  //    No fresh token is minted here — reuse whatever is persisted (the
  //    Rust side only sends it when it belongs to this server).
  if (details?.agent?.id) {
    return { serverId, agentDeviceId: details.agent.id }
  }

  // 3. If there is an active pairing code, claim it (claim mints a token).
  if (details?.pairing?.code) {
    const claim = await claimPairing(details.pairing.code, directory)
    return { serverId: claim.serverId, agentDeviceId: claim.agentDeviceId, sessionToken: claim.sessionToken }
  }

  // 4. Otherwise request a new pairing code and claim it (token minted).
  try {
    const pairing = await getPairingCode(serverId)
    if (pairing?.code) {
      const claim = await claimPairing(pairing.code, directory)
      return { serverId: claim.serverId, agentDeviceId: claim.agentDeviceId, sessionToken: claim.sessionToken }
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

// ─── Server settings / lifecycle ─────────────────────────────────────────────

export async function fetchServerDetail(serverId: string): Promise<any> {
  return apiFetch(`/api/servers/${serverId}`)
}

export async function updateServerSettings(
  serverId: string,
  body: { settings?: Record<string, unknown>; serverDir?: string },
): Promise<{ settings: any; serverDir: string | null }> {
  return apiFetch(`/api/servers/${serverId}/settings`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteServer(serverId: string, confirmName: string): Promise<any> {
  return apiFetch(`/api/servers/${serverId}`, {
    method: 'DELETE',
    body: JSON.stringify({ confirmName }),
  })
}

export async function fetchConsoleLines(serverId: string): Promise<any> {
  return apiFetch(`/api/servers/${serverId}/console`)
}

// ─── Changes ─────────────────────────────────────────────────────────────────

export async function fetchChanges(serverId?: string): Promise<any[]> {
  const url = serverId
    ? `/api/changes?serverId=${serverId}&limit=100`
    : '/api/changes?limit=100'
  const data = await apiFetch(url)
  return Array.isArray(data) ? data : []
}

/**
 * Apply every pending change for a server, one at a time, so each change gets
 * a real git-checkpointed apply on the agent (the orchestrator's batch/apply
 * endpoint only flips DB status without applying files — not used here).
 * List-fetch failures throw; individual applies are reported per-change.
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
  } catch (e) {
    // Thread fetch is a background poll — a transient failure should not
    // clear the visible conversation, so null is the right contract here.
    console.warn('fetchServerThread failed:', e)
    return null
  }
}

// ─── Players ─────────────────────────────────────────────────────────────────

export async function fetchPlayers(serverId: string): Promise<any[]> {
  const data = await apiFetch(`/api/servers/${serverId}/players`)
  return Array.isArray(data) ? data : []
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

export async function fetchServerResources(serverId: string): Promise<any> {
  return apiFetch(`/api/servers/${serverId}/resources`)
}

/** Trigger an orchestrator-side scan (agent scans + syncs the resource index). */
export async function scanServerResources(serverId: string): Promise<any> {
  return apiFetch(`/api/servers/${serverId}/scan`, { method: 'POST' })
}

// ─── Org / Billing ───────────────────────────────────────────────────────────

export async function fetchOrg(): Promise<any> {
  return apiFetch('/api/org')
}
