import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config';
import { authPlugin } from './auth';
import { registerRoutes } from './http/routes';
import { AgentGateway } from './ws/agentGateway';

async function main() {
  const fastify = Fastify({
    logger: {
      level: config.nodeEnv === 'development' ? 'info' : 'warn',
    },
  });

  // Register plugins
  const corsOrigins = [process.env.DASHBOARD_ORIGIN, ...config.corsOrigins]
    .filter((o): o is string => Boolean(o));
  await fastify.register(cors, {
    origin: corsOrigins,
    credentials: true,
  });

  await fastify.register(websocket, {
    options: {
      maxPayload: 10 * 1024 * 1024, // 10MB max message size
    },
  });

  // Auth hook MUST be registered before any routes so it can never be bypassed
  // by registration order. Public paths are allowlisted inside the plugin.
  await fastify.register(authPlugin);

  // Initialize agent gateway (WebSocket connection manager)
  const agentGateway = new AgentGateway();
  fastify.decorate('agentGateway', agentGateway);

  // Register HTTP routes (auth already active at this point)
  await registerRoutes(fastify);

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

    // Startup self-test for the auth layer.
    if (process.env.CLERK_SECRET_KEY) {
      console.log('auth: Clerk verifier configured');
    } else {
      console.warn(
        'auth: CLERK_SECRET_KEY is NOT set — every route requiring authentication will return 401. ' +
        'Set CLERK_SECRET_KEY (or rely on transitional AUTH_ALLOW_ANON for headerless requests).'
      );
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
