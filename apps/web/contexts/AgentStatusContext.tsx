'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authedFetch, AuthError } from '@/lib/auth-fetch';
import { useAuth } from '@clerk/nextjs';

interface AgentStatus {
  connected: boolean;
  connectedServers: string[];
  total: number;
}

interface AgentStatusContextType {
  status: AgentStatus;
  isConnected: boolean;
  isChecking: boolean;
}

const AgentStatusContext = createContext<AgentStatusContextType>({
  status: { connected: false, connectedServers: [], total: 0 },
  isConnected: false,
  isChecking: true,
});

export function AgentStatusProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<AgentStatus>({
    connected: false,
    connectedServers: [],
    total: 0,
  });
  const [isChecking, setIsChecking] = useState(true);

  const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://158.101.167.118:3001';
  const wsUrl = orchestratorUrl.replace('http://', 'ws://').replace('https://', 'wss://');

  // Initialize WebSocket connection
  useEffect(() => {
    let wsInstance: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let cancelled = false;

    const connect = async () => {
      // Guard against malformed derivation (e.g. proxy-relative base URL) —
      // skip connecting rather than throwing inside the effect.
      if (!/^wss?:\/\//.test(wsUrl)) {
        console.warn('[AgentStatus] Invalid WS URL, skipping connection:', wsUrl);
        setIsChecking(false);
        return;
      }
      // Present a fresh bearer token on the upgrade URL so the socket gets an
      // org-scoped feed; this also un-blocks flipping AUTH_ALLOW_ANON=false
      // (anonymous sockets now receive an empty list). getToken() refreshes
      // near-expiry Clerk tokens automatically.
      let url = `${wsUrl}/ws/status`;
      try {
        const token = await getToken();
        if (token) url += `?token=${encodeURIComponent(token)}`;
      } catch {
        // Token fetch failed — connect anonymously rather than not at all.
      }
      if (cancelled) return;

      wsInstance = new WebSocket(url);

      wsInstance.onopen = () => {
        console.log('[AgentStatus] WebSocket connected');
        setIsChecking(false);
      };

      wsInstance.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'agent.status') {
            setStatus({
              connected: data.total > 0,
              connectedServers: data.connectedServers || [],
              total: data.total,
            });
          }
        } catch (e) {
          console.error('[AgentStatus] Failed to parse message:', e);
        }
      };

      wsInstance.onerror = (error) => {
        console.error('[AgentStatus] WebSocket error:', error);
      };

      wsInstance.onclose = () => {
        console.log('[AgentStatus] WebSocket disconnected, reconnecting...');
        wsInstance = null;
        if (cancelled) return;
        // Reconnect after 3 seconds
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    // Also poll REST API as fallback
    const pollStatus = async () => {
      try {
        const res = await authedFetch(`${orchestratorUrl}/api/agent/status`);
        if (res.status === 401) {
          // Auth loss — stop polling; the layout handles re-auth.
          setIsChecking(false);
          return;
        }
        const data = await res.json();
        setStatus({
          connected: data.total > 0,
          connectedServers: data.connectedServers || [],
          total: data.total,
        });
        setIsChecking(false);
      } catch (e) {
        if (e instanceof AuthError) {
          setIsChecking(false);
          return;
        }
        console.error('[AgentStatus] Poll failed:', e);
      }
    };

    // Initial poll
    pollStatus();

    // Poll every 10 seconds as fallback
    const pollInterval = setInterval(pollStatus, 10000);

    return () => {
      cancelled = true;
      if (wsInstance) wsInstance.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
    };
  }, [orchestratorUrl, wsUrl]);

  const isConnected = status.connected;

  return (
    <AgentStatusContext.Provider value={{ status, isConnected, isChecking }}>
      {children}
    </AgentStatusContext.Provider>
  );
}

export function useAgentStatus() {
  const context = useContext(AgentStatusContext);
  if (!context) {
    throw new Error('useAgentStatus must be used within AgentStatusProvider');
  }
  return context;
}
