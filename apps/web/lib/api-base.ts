import { ORCHESTRATOR_URL } from './config';

// Simple cache for faster loading
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

function cachedFetch<T>(key: string, url: string, options?: RequestInit): Promise<T> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return Promise.resolve(cached.data as T);
  }
  return fetch(url, options)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      cache.set(key, { data, timestamp: Date.now() });
      return data;
    });
}

function clearCache(prefix?: string) {
  if (prefix) {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}


/**
 * Fetch servers from orchestrator
 */
export async function fetchServers(): Promise<any[]> {
  return cachedFetch('servers', `${ORCHESTRATOR_URL}/api/servers`);
}

/**
 * Fetch server details
 */
export async function fetchServer(serverId: string): Promise<any> {
  return cachedFetch(`server:${serverId}`, `${ORCHESTRATOR_URL}/api/servers/${serverId}`);
}

/**
 * Fetch chat messages for a thread
 */
export async function fetchMessages(threadId: string): Promise<any[]> {
  return cachedFetch(`messages:${threadId}`, `${ORCHESTRATOR_URL}/api/threads/${threadId}/messages`);
}

export async function fetchChanges(serverId: string): Promise<any[]> {
  return cachedFetch(`changes:${serverId}`, `${ORCHESTRATOR_URL}/api/servers/${serverId}/changes`);
}

export async function fetchPlayers(serverId: string): Promise<any[]> {
  return cachedFetch(`players:${serverId}`, `${ORCHESTRATOR_URL}/api/servers/${serverId}/players`);
}

export async function fetchServerSettings(serverId: string): Promise<any> {
  return cachedFetch(`settings:${serverId}`, `${ORCHESTRATOR_URL}/api/servers/${serverId}/settings`);
}

export async function updateServerSettings(serverId: string, settings: Record<string, any>): Promise<any> {
  const response = await fetch(`${ORCHESTRATOR_URL}/api/servers/${serverId}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  clearCache(`settings:${serverId}`);
  return data;
}

/**
 * Create a new server
 */
export async function createServer(name: string): Promise<{ id: string; pairingCode: string }> {
  const response = await fetch(`${ORCHESTRATOR_URL}/api/servers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error(`Failed to create server: ${response.status}`);
  return response.json();
}

/**
 * Send a chat message
 */
export async function sendChatMessage(threadId: string, message: string): Promise<any> {
  const response = await fetch(`${ORCHESTRATOR_URL}/api/threads/${threadId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) throw new Error(`Failed to send message: ${response.status}`);
  return response.json();
}

/**
 * Apply a change
 */
export async function applyChange(changeId: string): Promise<any> {
  const response = await fetch(`${ORCHESTRATOR_URL}/api/changes/${changeId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Failed to apply change: ${response.status}`);
  return response.json();
}

/**
 * Scan resources for a server
 */
export async function scanResources(serverId: string): Promise<any> {
  const response = await fetch(`${ORCHESTRATOR_URL}/api/servers/${serverId}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Failed to scan resources: ${response.status}`);
  return response.json();
}
