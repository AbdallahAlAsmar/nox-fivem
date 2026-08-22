import { ORCHESTRATOR_URL } from './config';

// ─── SWR-based hooks ──────────────────────────────────────────────────────────

const swrFetcher = (url: string) =>
  fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

/** Fetch all servers */
export async function fetchServers(): Promise<any[]> {
  try {
    const data = await swrFetcher(`${ORCHESTRATOR_URL}/api/servers`);
    return data;
  } catch {
    return [];
  }
}

/** Fetch a single server */
export async function fetchServer(serverId: string): Promise<any> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/servers/${serverId}`);
  } catch {
    return null;
  }
}

/** Fetch chat messages for a thread */
export async function fetchMessages(threadId: string): Promise<any[]> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/threads/${threadId}/messages`);
  } catch {
    return [];
  }
}

/** Fetch pending changes for a server */
export async function fetchChanges(serverId: string): Promise<any[]> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/servers/${serverId}/changes`);
  } catch {
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
  } catch {
    return [];
  }
}

/** Create a new server */
export async function createServer(
  name: string,
): Promise<{ id: string; pairingCode: string }> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/servers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to create server: ${res.status}`);
  const data = await res.json();
  return { id: data.server.id, pairingCode: data.pairing.code };
}

/** Fetch threads for a server */
export async function fetchThreads(serverId: string): Promise<any[]> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/threads?serverId=${serverId}`);
  } catch {
    return [];
  }
}

/** Fetch messages for a thread */
export async function fetchThreadMessages(threadId: string): Promise<any[]> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/threads/${threadId}/messages`);
  } catch {
    return [];
  }
}

/** Fetch one shared thread per server */
export async function fetchServerThread(serverId: string): Promise<any> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/servers/${serverId}/thread`);
  } catch {
    return null;
  }
}

/** Delete a thread */
export async function deleteThread(serverId: string, threadId: string): Promise<void> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/threads/${threadId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
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
  } catch {
    return { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }
}

/** Delete a server */
export async function deleteServer(serverId: string, confirmName: string): Promise<void> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/servers/${serverId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmName }),
  });
  if (!res.ok) throw new Error(`Failed to delete server: ${res.status}`);
}
export async function sendChatMessage(
  threadId: string,
  message: string,
  userId?: string,
): Promise<any> {
  const res = await fetch(
    `${ORCHESTRATOR_URL}/api/threads/${threadId}/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, userId: userId || 'anonymous' }),
    },
  );
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
  return res.json();
}

/** Apply a staged change */
export async function applyChange(changeId: string): Promise<any> {
  const res = await fetch(
    `${ORCHESTRATOR_URL}/api/changes/${changeId}/apply`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  if (!res.ok) throw new Error(`Failed to apply change: ${res.status}`);
  return res.json();
}

/** Scan resources for a server */
export async function scanResources(serverId: string): Promise<any> {
  const res = await fetch(
    `${ORCHESTRATOR_URL}/api/servers/${serverId}/scan`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  if (!res.ok) throw new Error(`Failed to scan resources: ${res.status}`);
  return res.json();
}

/** Restart a server via the agent */
export async function restartServer(serverId: string): Promise<any> {
  const res = await fetch(
    `${ORCHESTRATOR_URL}/api/servers/${serverId}/restart`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  if (!res.ok) throw new Error(`Failed to restart server: ${res.status}`);
  return res.json();
}

/** Fetch all resources for a server */
export async function fetchServerResources(serverId: string): Promise<any[]> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/servers/${serverId}/resources`);
  } catch {
    return [];
  }
}

/** Fetch players for a server */
export async function fetchPlayers(serverId: string): Promise<any[]> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/servers/${serverId}/players`);
  } catch {
    return [];
  }
}

/** Ban a player */
export async function banPlayer(
  serverId: string,
  playerId: string,
  reason?: string,
): Promise<any> {
  const res = await fetch(
    `${ORCHESTRATOR_URL}/api/servers/${serverId}/players/${playerId}/ban`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
  );
  if (!res.ok) throw new Error(`Failed to ban player: ${res.status}`);
  return res.json();
}

/** Unban a player */
export async function unbanPlayer(serverId: string, playerId: string): Promise<any> {
  const res = await fetch(
    `${ORCHESTRATOR_URL}/api/servers/${serverId}/players/${playerId}/unban`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  if (!res.ok) throw new Error(`Failed to unban player: ${res.status}`);
  return res.json();
}

/** Fetch org billing info */
export async function fetchOrg(): Promise<any> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/org`);
  } catch {
    return null;
  }
}

/** Fetch agent connection status */
export async function fetchAgentStatus(): Promise<{ connectedServers: string[]; total: number }> {
  try {
    return await swrFetcher(`${ORCHESTRATOR_URL}/api/agent/status`);
  } catch {
    return { connectedServers: [], total: 0 };
  }
}
