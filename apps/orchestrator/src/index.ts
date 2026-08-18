import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config';
import { registerRoutes } from './http/routes';
import { registerChatRoutes } from './chat/routes';
import { AgentGateway } from './ws/agentGateway';

async function main() {
  const fastify = Fastify({
    logger: {
      level: config.nodeEnv === 'development' ? 'info' : 'warn',
    },
  });

  // Register plugins
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(websocket, {
    options: {
      maxPayload: 10 * 1024 * 1024, // 10MB max message size
    },
  });

  // Initialize agent gateway (WebSocket connection manager)
  const agentGateway = new AgentGateway();
  fastify.decorate('agentGateway', agentGateway);

  // Register HTTP routes
  await registerRoutes(fastify);
  await registerChatRoutes(fastify);

  // WebSocket endpoint for agents
  fastify.register(async function (fastify) {
    fastify.get('/ws/agent', { websocket: true }, (connection, req) => {
      agentGateway.handleConnection(connection, req);
    });
  });

  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }));

  // Start server
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`🚀 Orchestrator running on http://localhost:${config.port}`);
    console.log(`🔌 WebSocket endpoint: ws://localhost:${config.port}/ws/agent`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
