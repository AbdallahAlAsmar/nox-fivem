import { WebSocket } from 'ws';
import { FastifyRequest } from 'fastify';
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

interface AgentConnection {
  serverId: string;
  agentDeviceId: string;
  ws: WebSocket;
  lastHeartbeat: Date;
  capabilities: string[];
}

export class AgentGateway {
  private connections: Map<string, AgentConnection> = new Map();
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  handleConnection(ws: WebSocket, req: FastifyRequest) {
    console.log('Agent connection attempt from:', req.ip);

    let connection: AgentConnection | null = null;

    ws.on('message', async (data: Buffer) => {
      try {
        const rawMessage = JSON.parse(data.toString());
        const message = AgentMessageEnvelopeSchema.parse(rawMessage);

        // Handle different message types
        switch (message.type) {
          case 'agent.hello':
            await this.handleHello(ws, message.payload as AgentHello, message.messageId);
            connection = {
              serverId: (message.payload as AgentHello).serverId,
              agentDeviceId: (message.payload as AgentHello).agentDeviceId,
              ws,
              lastHeartbeat: new Date(),
              capabilities: (message.payload as AgentHello).capabilities,
            };
            this.connections.set(connection.serverId, connection);
            break;

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
      if (connection) {
        console.log(`Agent disconnected: ${connection.serverId}`);
        this.connections.delete(connection.serverId);
        
        // Update server status to offline
        await prisma.server.update({
          where: { id: connection.serverId },
          data: { status: 'offline', lastSeenAt: new Date() },
        });

        // Reject any pending requests
        for (const [requestId, pending] of this.pendingRequests) {
          if (pending.timeout) clearTimeout(pending.timeout);
          pending.reject(new Error('Agent disconnected'));
          this.pendingRequests.delete(requestId);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private async handleHello(ws: WebSocket, hello: AgentHello, messageId: string) {
    try {
      // Verify agent device exists and is paired
      const agentDevice = await prisma.agentDevice.findUnique({
        where: { id: hello.agentDeviceId },
        include: { server: true },
      });

      if (!agentDevice) {
        ws.send(JSON.stringify(createEnvelope('agent.rejected', {
          payload: createError(ErrorCodes.INVALID_TOKEN, 'Agent device not found'),
        })));
        ws.close();
        return;
      }

      if (agentDevice.status !== 'paired') {
        ws.send(JSON.stringify(createEnvelope('agent.rejected', {
          payload: createError(ErrorCodes.TOKEN_REVOKED, 'Agent is not paired'),
        })));
        ws.close();
        return;
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
    } catch (error) {
      console.error('Failed to handle agent hello:', error);
      ws.send(JSON.stringify(createEnvelope('agent.rejected', {
        payload: createError(ErrorCodes.INTERNAL_ERROR, 'Authentication failed'),
      })));
      ws.close();
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

      // Store pending request
      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      // Send message
      connection.ws.send(JSON.stringify(message));
    });
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
}
