'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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
  const [status, setStatus] = useState<AgentStatus>({
    connected: false,
    connectedServers: [],
    total: 0,
  });
  const [isChecking, setIsChecking] = useState(true);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://158.101.167.118:3001';
  const wsUrl = orchestratorUrl.replace('http://', 'ws://').replace('https://', 'wss://');

  // Initialize WebSocket connection
  useEffect(() => {
    let wsInstance: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      wsInstance = new WebSocket(`${wsUrl}/ws/status`);

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
        // Reconnect after 3 seconds
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    // Also poll REST API as fallback
    const pollStatus = async () => {
      try {
        const res = await fetch(`${orchestratorUrl}/api/agent/status`);
        const data = await res.json();
        setStatus({
          connected: data.total > 0,
          connectedServers: data.connectedServers || [],
          total: data.total,
        });
        setIsChecking(false);
      } catch (e) {
        console.error('[AgentStatus] Poll failed:', e);
      }
    };

    // Initial poll
    pollStatus();

    // Poll every 10 seconds as fallback
    const pollInterval = setInterval(pollStatus, 10000);

    setWs(wsInstance);

    return () => {
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
