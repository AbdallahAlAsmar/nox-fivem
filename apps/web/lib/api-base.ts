const ORCHESTRATOR_URL = process.env.VERCEL
  ? '/api/orchestrator'
  : process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://158.101.167.118:3001';

/**
 * Fetch servers from orchestrator
 */
export async function fetchServers(): Promise<any[]> {
  try {
    const response = await fetch(`${ORCHESTRATOR_URL}/api/servers`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

/**
 * Fetch server details
 */
export async function fetchServer(serverId: string): Promise<any> {
  try {
    const response = await fetch(`${ORCHESTRATOR_URL}/api/servers/${serverId}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Fetch chat messages for a thread
 */
export async function fetchMessages(threadId: string): Promise<any[]> {
  try {
    const response = await fetch(`${ORCHESTRATOR_URL}/api/threads/${threadId}/messages`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

/**
 * Fetch changes for a server
 */
export async function fetchChanges(serverId: string): Promise<any[]> {
  try {
    const response = await fetch(`${ORCHESTRATOR_URL}/api/servers/${serverId}/changes`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
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
