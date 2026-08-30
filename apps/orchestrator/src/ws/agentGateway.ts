import { WebSocket } from 'ws';
import { FastifyRequest } from 'fastify';
import * as crypto from 'crypto';
import { prisma } from '@fivem-ai/db';
import {
  AgentMessageEnvelopeSchema,
  createEnvelope,
  createResponse,
  ErrorCodes,
  createError,
  type AgentHello,
  type HeartbeatPayload,
} from '@fivem-ai/shared/protocol';
import type { ErrorCode } from '@fivem-ai/shared/protocol';

const HELLO_TIMEOUT_MS = 5_000; // must complete handshake within 5s of upgrade
const HEARTBEAT_REAP_INTERVAL_MS = 60_000; // scan cadence
const HEARTBEAT_STALE_MS = 120_000; // heartbeat older than this => dead connection
const DUPLICATE_FRESH_MS = 90_000; // existing connection considered alive within this window

interface AgentConnection {
  serverId: string;
  agentDeviceId: string;
  ws: WebSocket;
  lastHeartbeat: Date;
  capabilities: string[];
}

interface PendingRequest {
  serverId?: string;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
}

function constantTimeHashCompare(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');
  // Guard length mismatch first — timingSafeEqual throws on unequal lengths.
  if (a.length !== b.length || a.length === 0) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Transitional flag: when true, agents that paired before session tokens
 * existed (pairingTokenHash is null) may still connect WITHOUT a sessionToken.
 * Defaults to TRUE so existing deploys keep working; flipping it off is an ops
 * action once all agents have re-paired.
 */
function agentLegacyOk(): boolean {
  const raw = process.env.AGENT_LEGACY_OK;
  if (raw === undefined || raw === '') return process.env.NODE_ENV !== 'production';
  return raw === 'true' || raw === '1';
}

export class AgentGateway {
  private connections: Map<string, AgentConnection> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private heartbeatReaper: NodeJS.Timeout | null = null;
  /** Subscribers (e.g. /ws/status sockets) notified when the connection set changes. */
  public readonly statusListeners: Set<() => void> = new Set();

  constructor() {
    // Single reaper for the process lifetime of the gateway instance.
    this.heartbeatReaper = setInterval(() => this.reapStaleConnections(), HEARTBEAT_REAP_INTERVAL_MS);
    if (typeof this.heartbeatReaper.unref === 'function') {
      this.heartbeatReaper.unref();
    }
  }

  handleConnection(ws: WebSocket, req: FastifyRequest) {
    console.log('Agent connection attempt from:', req.ip);

    let connection: AgentConnection | null = null;
    let helloCompleted = false;

    // Any socket that never completes a valid hello is closed after 5s.
    const helloTimer = setTimeout(() => {
      if (!helloCompleted && ws.readyState === WebSocket.OPEN) {
        console.warn('Closing agent socket: no valid hello within 5s');
        try {
          ws.send(JSON.stringify(createEnvelope('agent.rejected', {
            payload: createError(ErrorCodes.INVALID_TOKEN, 'Handshake timeout'),
          })));
        } catch {
          // socket already going away
        }
        ws.close();
      }
    }, HELLO_TIMEOUT_MS);
    if (typeof helloTimer.unref === 'function') helloTimer.unref();

    ws.on('message', async (data: Buffer) => {
      try {
        const rawMessage = JSON.parse(data.toString());
        const message = AgentMessageEnvelopeSchema.parse(rawMessage);

        switch (message.type) {
          case 'agent.hello': {
            if (helloCompleted) {
              // A second hello on an authenticated socket is protocol abuse.
              return;
            }
            await this.handleHello(ws, message.payload as AgentHello, message.messageId);
            break;
          }

          case 'agent.heartbeat':
            if (connection) {
              connection.lastHeartbeat = new Date();
              const payload = message.payload as HeartbeatPayload;
              await this.updateAgentHeartbeat(connection.agentDeviceId, payload);
            }
            break;

          case 'agent.response':
            this.handleAgentResponse(message);
            break;

          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Failed to handle agent message:', error);
        ws.send(JSON.stringify(createEnvelope('agent.error', {
          payload: createError(ErrorCodes.INVALID_REQUEST, 'Invalid message format'),
        })));
      }
    });

    ws.on('close', async () => {
      clearTimeout(helloTimer);
      if (!connection) return;

      // Only clean up if THIS connection still owns the slot — a newer
      // duplicate may already have replaced it. The stale-kick scenario
      // (old socket's close fires AFTER its replacement registered) must not
      // reject requests that were routed to the NEW connection, so the
      // pending-request rejection below runs ONLY when ownership still holds.
      const current = this.connections.get(connection.serverId);
      if (current === connection) {
        this.connections.delete(connection.serverId);
        this.broadcastStatus();

        // Reject only the pending requests that were sent to THIS agent (and
        // which this connection still owns the slot for).
        for (const [requestId, pending] of this.pendingRequests) {
          if (pending.serverId !== connection.serverId) continue;
          clearTimeout(pending.timeout);
          pending.reject(new Error('Agent disconnected'));
          this.pendingRequests.delete(requestId);
        }

        // Update server status to offline
        try {
          await prisma.server.update({
            where: { id: connection.serverId },
            data: { status: 'offline', lastSeenAt: new Date() },
          });
        } catch (err) {
          console.error(`Failed to mark server ${connection.serverId} offline:`, err);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Expose the completion callback used by handleHello. Registration into
    // this.connections happens ONLY after successful hello validation.
    (ws as any).__onAuthenticated = (conn: AgentConnection) => {
      helloCompleted = true;
      clearTimeout(helloTimer);
      connection = conn;
      this.connections.set(conn.serverId, conn);
      this.broadcastStatus();
    };
  }

  private async handleHello(ws: WebSocket, hello: AgentHello, messageId: string) {
    const rejectAndClose = (code: ErrorCode, messageText: string) => {
      ws.send(JSON.stringify(createEnvelope('agent.rejected', {
        payload: createError(code, messageText),
      })));
      ws.close();
    };

    try {
      // Verify agent device exists and is paired
      const agentDevice = await prisma.agentDevice.findUnique({
        where: { id: hello.agentDeviceId },
        include: { server: true },
      });

      if (!agentDevice) {
        return rejectAndClose(ErrorCodes.INVALID_TOKEN, 'Agent device not found');
      }

      if (agentDevice.status !== 'paired') {
        return rejectAndClose(ErrorCodes.TOKEN_REVOKED, 'Agent is not paired');
      }

      // Device/server binding check: a device may only speak for its own server.
      if (agentDevice.serverId !== hello.serverId) {
        return rejectAndClose(ErrorCodes.UNAUTHORIZED, 'Device is not bound to this server');
      }

      // ---- Session token verification -------------------------------------
      const storedHash = agentDevice.pairingTokenHash;
      if (hello.sessionToken) {
        const providedHash = crypto.createHash('sha256').update(hello.sessionToken).digest('hex');
        if (!storedHash || !constantTimeHashCompare(providedHash, storedHash)) {
          return rejectAndClose(ErrorCodes.INVALID_TOKEN, 'Invalid session token');
        }
      } else {
        // No token presented. Only tolerated in legacy mode AND only for
        // devices that predate session tokens (null stored hash).
        if (!(agentLegacyOk() && storedHash == null)) {
          return rejectAndClose(ErrorCodes.INVALID_TOKEN, 'Session token required');
        }
      }

      // ---- Duplicate connection handling ----------------------------------
      const existing = this.connections.get(hello.serverId);
      if (existing && existing.ws.readyState === WebSocket.OPEN) {
        const fresh = Date.now() - existing.lastHeartbeat.getTime() < DUPLICATE_FRESH_MS;
        if (fresh) {
          return rejectAndClose(ErrorCodes.ALREADY_CONNECTED, 'Another agent is already connected for this server');
        }
        // Stale duplicate: kick the old socket; the new one takes over below.
        try { existing.ws.close(); } catch { /* ignore */ }
        this.connections.delete(hello.serverId);
      }

      // Update agent device info
      await prisma.agentDevice.update({
        where: { id: hello.agentDeviceId },
        data: {
          agentVersion: hello.agentVersion,
          platform: hello.platform,
          lastHeartbeatAt: new Date(),
        },
      });

      // Update server status to online
      await prisma.server.update({
        where: { id: hello.serverId },
        data: { status: 'online', lastSeenAt: new Date() },
      });

      // Send authenticated response
      ws.send(JSON.stringify(createResponse(messageId, 'agent.authenticated', {
        serverTime: new Date().toISOString(),
        heartbeatIntervalMs: 30000,
        minimumAgentVersion: '0.1.0',
      })));

      console.log(`Agent authenticated: ${hello.serverId} (${hello.agentVersion})`);

      // Connection registration happens ONLY after successful validation.
      (ws as any).__onAuthenticated?.({
        serverId: hello.serverId,
        agentDeviceId: hello.agentDeviceId,
        ws,
        lastHeartbeat: new Date(),
        capabilities: hello.capabilities,
      });
    } catch (error) {
      console.error('Failed to handle agent hello:', error);
      rejectAndClose(ErrorCodes.INTERNAL_ERROR, 'Authentication failed');
    }
  }

  /** Close connections whose last heartbeat is older than the staleness window. */
  private reapStaleConnections() {
    const now = Date.now();
    for (const [serverId, conn] of this.connections) {
      if (now - conn.lastHeartbeat.getTime() > HEARTBEAT_STALE_MS) {
        console.warn(`Reaping stale agent connection for server ${serverId}`);
        try { conn.ws.close(); } catch { /* ignore */ }
        // The close handler performs scoped cleanup + status broadcast.
      }
    }
  }

  private async updateAgentHeartbeat(agentDeviceId: string, payload: HeartbeatPayload) {
    const device = await prisma.agentDevice.findUnique({
      where: { id: agentDeviceId },
      include: { server: true },
    });
    if (!device) return;

    await prisma.agentDevice.update({
      where: { id: agentDeviceId },
      data: { lastHeartbeatAt: new Date() },
    });

    await prisma.server.update({
      where: { id: device.serverId },
      data: {
        playerCount: payload.playerCount ?? 0,
        fps: payload.fps ?? 0,
      },
    });
  }

  private handleAgentResponse(message: any) {
    const requestId = message.requestId;
    const pending = this.pendingRequests.get(requestId);

    if (!pending) {
      console.log('Received response for unknown request:', requestId);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(requestId);

    if (message.payload?.ok) {
      pending.resolve(message.payload.result);
    } else {
      pending.reject(message.payload?.error || new Error('Unknown error'));
    }
  }

  // Send a command to an agent and wait for response
  async sendCommand<T = any>(
    serverId: string,
    action: string,
    args: Record<string, any>,
    timeoutMs: number = 30000
  ): Promise<T> {
    const connection = this.connections.get(serverId);

    if (!connection) {
      throw new Error(`Agent not connected for server ${serverId}`);
    }

    const requestId = crypto.randomUUID();
    const message = createEnvelope('agent.request', {
      requestId,
      serverId,
      payload: { action, args },
    });

    return new Promise<T>((resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request ${action} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      // Store pending request tagged with its owning server so disconnects can
      // reject only the requests that belong to the dropped agent.
      this.pendingRequests.set(requestId, { resolve, reject, timeout, serverId });

      // Send message
      connection.ws.send(JSON.stringify(message));
    });
  }

  /**
   * Immediately drop an agent's live connection and run the same cleanup as a
   * natural disconnect. Used by the revoke endpoint.
   */
  forceDisconnect(serverId: string): void {
    const connection = this.connections.get(serverId);
    if (!connection) return;
    try { connection.ws.close(); } catch { /* ignore */ }
    // The socket's close handler owns map cleanup + audit/status effects.
  }

  // Check if agent is connected for a server
  isConnected(serverId: string): boolean {
    return this.connections.has(serverId);
  }

  // Get connected server IDs
  getConnectedServers(): string[] {
    return Array.from(this.connections.keys());
  }

  // Get connection stats
  getStats() {
    return {
      totalConnections: this.connections.size,
      pendingRequests: this.pendingRequests.size,
      servers: this.getConnectedServers(),
    };
  }

  // Broadcast status to all connected WebSocket clients
  broadcastStatus() {
    const servers = this.getConnectedServers();
    console.log(`[StatusBroadcast] ${servers.length} agents connected: ${servers.join(', ') || 'none'}`);
    for (const listener of this.statusListeners) {
      try {
        listener();
      } catch (err) {
        console.error('[StatusBroadcast] listener failed:', err);
      }
    }
  }
}
