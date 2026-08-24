import { ORCHESTRATOR_URL } from './config';
import { authedFetch, AuthError } from './auth-fetch';

// ─── SWR-based hooks ──────────────────────────────────────────────────────────

const swrFetcher = (url: string) =>
  authedFetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

/** Fetch all servers */
export async function fetchServers(): Promise<any[]> {
  try {
    const data = await swrFetcher(`${ORCHESTRATOR_URL}/api/servers`);
    return data;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return [];
  }
}

/** Fetch a single server */
export async function fetchServer(serverId: string): Promise<any> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/servers/${serverId}`);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return null;
  }
}

/** Fetch chat messages for a thread */
export async function fetchMessages(threadId: string): Promise<any[]> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/threads/${threadId}/messages`);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return [];
  }
}

/** Fetch pending changes for a server */
export async function fetchChanges(serverId: string): Promise<any[]> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/servers/${serverId}/changes`);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return [];
  }
}

/** Fetch all changes across all servers */
export async function fetchAllChangesGlobal(serverId?: string): Promise<any[]> {
  try {
    const url = serverId
      ? `${ORCHESTRATOR_URL}/api/changes?serverId=${serverId}&limit=100`
      : `${ORCHESTRATOR_URL}/api/changes?limit=100`;
    return await swrFetcher(url);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return [];
  }
}

/** Create a new server */
export async function createServer(
  name: string,
): Promise<{
  id: string;
  pairingCode: string;
  pairing: { code: string; expiresAt: Date };
  connect?: { serverId: string; agentDeviceId: string; wsUrl: string };
}> {
  const res = await authedFetch(`${ORCHESTRATOR_URL}/api/servers`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to create server: ${res.status}`);
  const data = await res.json();
  return {
    id: data.server.id,
    pairingCode: data.pairing?.code || '',
    pairing: data.pairing || { code: '', expiresAt: new Date() },
    connect: data.connect,
  };
}

/** Fetch threads for a server */
export async function fetchThreads(serverId: string): Promise<any[]> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/threads?serverId=${serverId}`);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return [];
  }
}

/** Create a new thread for a server */
export async function createThread(serverId: string, title?: string): Promise<any> {
  const res = await authedFetch(
    `${ORCHESTRATOR_URL}/api/servers/${serverId}/threads`,
    {
      method: 'POST',
      body: JSON.stringify({ title: title || 'Chat' }),
    },
  );
  if (!res.ok) throw new Error(`Failed to create thread: ${res.status}`);
  return res.json();
}

/** Fetch messages for a thread */
export async function fetchThreadMessages(threadId: string): Promise<any[]> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/threads/${threadId}/messages`);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return [];
  }
}

/** Fetch one shared thread per server */
export async function fetchServerThread(serverId: string): Promise<any> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/servers/${serverId}/thread`);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return null;
  }
}

/** Delete a thread */
export async function deleteThread(serverId: string, threadId: string): Promise<void> {
  const res = await authedFetch(`${ORCHESTRATOR_URL}/api/threads/${threadId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete thread: ${res.status}`);
}

/** Fetch public resource catalog */
export async function fetchResourceCatalog(params?: {
  category?: string; search?: string; type?: string; page?: string; limit?: string;
}): Promise<any> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.search) qs.set('search', params.search);
  if (params?.type) qs.set('type', params.type);
  if (params?.page) qs.set('page', params.page);
  if (params?.limit) qs.set('limit', params.limit);
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/resources/catalog${qs.toString() ? '?' + qs.toString() : ''}`);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }
}

/** Install a resource */
export async function installResource(serverId: string, slug: string): Promise<any> {
  const res = await authedFetch(`${ORCHESTRATOR_URL}/api/resources/install`, {
    method: 'POST',
    body: JSON.stringify({ serverId, slug }),
  });
  if (!res.ok) throw new Error(`Failed to install resource: ${res.status}`);
  return res.json();
}

/** Fetch install history for a server */
export async function fetchResourceInstalls(serverId: string): Promise<any[]> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/resources/installs/${serverId}`);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return [];
  }
}

/** Rollback a resource install */
export async function rollbackResourceInstall(installId: string): Promise<void> {
  const res = await authedFetch(`${ORCHESTRATOR_URL}/api/resources/installs/${installId}/rollback`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to rollback: ${res.status}`);
}

/** Delete a server */
export async function deleteServer(serverId: string, confirmName: string): Promise<void> {
  const res = await authedFetch(`${ORCHESTRATOR_URL}/api/servers/${serverId}`, {
    method: 'DELETE',
    body: JSON.stringify({ confirmName }),
  });
  if (!res.ok) throw new Error(`Failed to delete server: ${res.status}`);
}
export async function sendChatMessage(
  threadId: string,
  message: string,
  userId?: string,
): Promise<any> {
  const res = await authedFetch(
    `${ORCHESTRATOR_URL}/api/threads/${threadId}/chat`,
    {
      method: 'POST',
      body: JSON.stringify({ message, userId: userId || 'anonymous' }),
    },
  );
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
  return res.json();
}

/** Apply a staged change */
export async function applyChange(changeId: string): Promise<any> {
  const res = await authedFetch(
    `${ORCHESTRATOR_URL}/api/changes/${changeId}/apply`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(`Failed to apply change: ${res.status}`);
  return res.json();
}

/** Cancel a pending change */
export async function cancelChange(changeId: string): Promise<any> {
  const res = await authedFetch(
    `${ORCHESTRATOR_URL}/api/changes/${changeId}/cancel`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(`Failed to cancel change: ${res.status}`);
  return res.json();
}

/** Scan resources for a server */
export async function scanResources(serverId: string): Promise<any> {
  const res = await authedFetch(
    `${ORCHESTRATOR_URL}/api/servers/${serverId}/scan`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(`Failed to scan resources: ${res.status}`);
  return res.json();
}

/** Restart a server via the agent */
export async function restartServer(serverId: string): Promise<any> {
  const res = await authedFetch(
    `${ORCHESTRATOR_URL}/api/servers/${serverId}/restart`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(`Failed to restart server: ${res.status}`);
  return res.json();
}

/** Mint or refresh the pairing code for a server */
export async function refreshPairing(serverId: string): Promise<{ code: string; expiresAt: Date }> {
  const res = await authedFetch(
    `${ORCHESTRATOR_URL}/api/servers/${serverId}/pairing`,
    { method: 'POST' },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Failed to refresh pairing: ${res.status}`);
  }
  const data = await res.json();
  return data.pairing;
}

/** Fetch all resources for a server */
export async function fetchServerResources(serverId: string): Promise<any[]> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/servers/${serverId}/resources`);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return [];
  }
}

/** Fetch players for a server */
export async function fetchPlayers(serverId: string): Promise<any[]> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/servers/${serverId}/players`);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return [];
  }
}

/** Ban a player */
export async function banPlayer(
  serverId: string,
  playerId: string,
  reason?: string,
): Promise<any> {
  const res = await authedFetch(
    `${ORCHESTRATOR_URL}/api/servers/${serverId}/players/${playerId}/ban`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  );
  if (!res.ok) throw new Error(`Failed to ban player: ${res.status}`);
  return res.json();
}

/** Unban a player */
export async function unbanPlayer(serverId: string, playerId: string): Promise<any> {
  const res = await authedFetch(
    `${ORCHESTRATOR_URL}/api/servers/${serverId}/players/${playerId}/unban`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(`Failed to unban player: ${res.status}`);
  return res.json();
}

/** Fetch org billing info */
export async function fetchOrg(): Promise<any> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/org`);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return null;
  }
}

/** Fetch usage and cost data */
export async function fetchUsage(): Promise<any> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/usage`);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return null;
  }
}

/** Batch approve changes */
export async function batchApproveChanges(changeIds: string[], serverId?: string): Promise<{ approved: string[]; skipped: Array<{ id: string; reason: string }> }> {
  const res = await authedFetch(`${ORCHESTRATOR_URL}/api/changes/batch/apply`, {
    method: 'POST',
    body: JSON.stringify({ changeIds, serverId }),
  });
  if (!res.ok) throw new Error(`Failed to batch approve: ${res.status}`);
  return res.json();
}

/** Batch cancel changes */
export async function batchCancelChanges(changeIds: string[], serverId?: string): Promise<{ cancelled: string[]; skipped: Array<{ id: string; reason: string }> }> {
  const res = await authedFetch(`${ORCHESTRATOR_URL}/api/changes/batch/cancel`, {
    method: 'POST',
    body: JSON.stringify({ changeIds, serverId }),
  });
  if (!res.ok) throw new Error(`Failed to batch cancel: ${res.status}`);
  return res.json();
}

/** Fetch agent connection status */
export async function fetchAgentStatus(): Promise<{ connectedServers: string[]; total: number }> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/agent/status`);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return { connectedServers: [], total: 0 };
  }
}

/** Check onboarding status */
export async function fetchOnboardingStatus(): Promise<{ onboarded: boolean }> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/onboarding/status`);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return { onboarded: true }; // default to onboarding complete
  }
}

/** Fetch resource config (fxmanifest.lua) for editing */
export async function fetchResourceConfig(serverId: string, resourceName: string): Promise<{
  resourceName: string;
  relativePath: string;
  manifestPath: string;
  content: string;
  sha256: string;
  size: number;
  modifiedAt: string;
  error?: string;
} | null> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/servers/${serverId}/resources/${encodeURIComponent(resourceName)}/config`);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return null as any;
  }
}

/** Save a resource config change */
export async function saveResourceConfig(
  serverId: string,
  resourceName: string,
  content: string,
  expectedSha256?: string,
): Promise<{ success: boolean; sha256: string }> {
  const res = await authedFetch(
    `${ORCHESTRATOR_URL}/api/servers/${serverId}/resources/${encodeURIComponent(resourceName)}/config`,
    {
      method: 'POST',
      body: JSON.stringify({ content, expectedSha256 }),
    },
  );
  if (!res.ok) throw new Error(`Failed to save config: ${res.status}`);
  return res.json();
}
