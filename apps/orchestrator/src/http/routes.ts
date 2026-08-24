import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import * as crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@fivem-ai/db';
import { requireAuth, verifyBearerToken, authAllowAnon } from '../auth';
import {
  assertServerAccess,
  assertThreadAccess,
  assertChangeAccess,
} from '../auth/access';
import { sanitizeRelativePath } from './pathGuard';
import { parseDiffToPatch } from './parseDiff';
import type { AgentGateway } from '../ws/agentGateway';
import { cache } from '../cache/cache';
import { handleChatMessage, ChatCapError } from '../chat/chatService';
import { registerResourceRoutes } from './resourceRoutes';

export async function registerRoutes(fastify: FastifyInstance) {
  // ── Rate limiting ────────────────────────────────────────────────────────
  // Registered BEFORE any routes/sub-plugins so its onRoute hook sees every
  // registration below (registerResourceRoutes included). Global safety net:
  // 300 req/min per IP; stricter per-route limits set via route config.
  // Route limiters run in the preHandler hook so they execute AFTER
  // authPlugin's preHandler hook — keyGenerators can therefore read
  // request.authUser synchronously for true per-user keys (falls back to IP
  // when authUser is absent, e.g. anon mode).
  await fastify.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    // 429s must be machine-readable JSON for the dashboard/agent clients.
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: 'rate_limited',
      message: `Rate limit exceeded, retry in ${context.after}`,
    }),
  });

  const perUserKey = (request: FastifyRequest): string =>
    `${request.authUser?.userId ?? request.ip}:${request.ip}`;

  await fastify.register(registerResourceRoutes);

  // Zod .parse() throws ZodError on bad input; without this handler Fastify
  // would surface it as a 500. Map it to 400 with the first issue message.
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError && !reply.sent) {
      return reply.status(400).send({
        error: error.issues[0]?.message || 'Invalid request payload',
      });
    }
    if ((error as any)?.statusCode === 429 && !reply.sent) {
      // Rate-limit rejections carry the plugin's JSON body through untouched,
      // preserving the machine-readable `error: 'rate_limited'` shape.
      return reply.status(429).send(error);
    }
    return reply.send(error);
  });

  /**
   * Extract optional txAdmin connection details from a Server's settings JSON
   * so agent commands (listPlayers/ban/unban/restart*) can reach txAdmin.
   * Storage contract: settings JSON keys useTxAdmin/txadminUrl/txadminApiKey —
   * the same key names the Tauri agent's WS arms read from args. Absent or
   * incomplete config yields {} and agents reply honestly that they cannot act.
   */
  function txAdminArgs(settings: unknown): {
    useTxAdmin?: boolean;
    txadminUrl?: string;
    txadminApiKey?: string;
  } {
    const s = (settings && typeof settings === 'object' ? settings : {}) as Record<string, unknown>;
    const url = typeof s.txadminUrl === 'string' ? s.txadminUrl.trim() : '';
    const key = typeof s.txadminApiKey === 'string' ? s.txadminApiKey.trim() : '';
    if (s.useTxAdmin === true && url && key) {
      return { useTxAdmin: true, txadminUrl: url, txadminApiKey: key };
    }
    return {};
  }
  // ============================================
  // Servers
  // ============================================

  // List servers for the caller's org
    fastify.get('/api/servers', async (request, reply) => {
      const user = requireAuth(request);
      const orgId = user.orgId;

      const servers = await prisma.server.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        include: {
          agentDevices: {
            where: { status: 'paired' },
            take: 1,
          },
          _count: {
            select: { resources: true },
          },
        },
      });

      return servers.map((server: any) => ({
        id: server.id,
        name: server.name,
        framework: server.framework,
        status: server.status,
        lastSeenAt: server.lastSeenAt,
        resourceCount: server._count.resources,
        hasAgent: server.agentDevices.length > 0,
        playerCount: server.playerCount ?? 0,
        maxPlayers: server.maxPlayers ?? 64,
        fps: server.fps ?? 0,
      }));
    });

  // Create a new server
  fastify.post('/api/servers', async (request, reply) => {
    const user = requireAuth(request);
    const orgId = user.orgId;

    const body = z.object({
      name: z.string().min(1).max(100),
      directory: z.string().optional(),
    }).parse(request.body);

    // Create server in auto-paired state
    const server = await prisma.server.create({
      data: {
        orgId: orgId,
        name: body.name,
        status: 'paired',
        framework: 'unknown',
        rootLabel: body.directory || null,
      },
    });

    // Auto-create paired agent device
    const device = await prisma.agentDevice.create({
      data: {
        serverId: server.id,
        status: 'paired',
        platform: 'unknown',
        lastHeartbeatAt: new Date(),
      },
    });

    return {
      server: {
        id: server.id,
        name: server.name,
        status: server.status,
      },
      connect: {
        serverId: server.id,
        agentDeviceId: device.id,
        wsUrl: process.env.ORCHESTRATOR_WS_URL || 'ws://localhost:3001/ws/agent',
      },
    };
  });

  // Get server details (includes pairing codes — strictly org-scoped)
  fastify.get('/api/servers/:serverId', async (request, reply) => {
    const authUser = await requireAuth(request);
    if (!authUser) return;
    const params = z.object({
      serverId: z.string(),
    }).parse(request.params);

    const server = await prisma.server.findFirst({
      where: { id: params.serverId, orgId: authUser.orgId },
      include: {
        agentDevices: {
          orderBy: { createdAt: 'desc' },
        },
        resources: {
          orderBy: { resourceName: 'asc' },
          take: 100,
        },
      },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Not found' });
    }

    const pairedDevice = server.agentDevices.find((d: any) => d.status === 'paired');
    const pendingDevice = server.agentDevices.find((d: any) => d.status === 'pending');
    const hasAgent = !!pairedDevice;

    let pairing: { code: string; expiresAt: Date } | null = null;
    if (!hasAgent) {
      const now = new Date();
      const codeStillValid =
        pendingDevice?.pairingCode &&
        pendingDevice.pairingExpiresAt &&
        pendingDevice.pairingExpiresAt > now;

      if (codeStillValid) {
        pairing = {
          code: pendingDevice.pairingCode as string,
          expiresAt: pendingDevice.pairingExpiresAt as Date,
        };
      } else {
        const issued = await issuePairing(server.id, pendingDevice?.id);
        pairing = { code: issued.code, expiresAt: issued.expiresAt };
      }
    }

    return {
      id: server.id,
      name: server.name,
      framework: server.framework,
      status: server.status,
      lastSeenAt: server.lastSeenAt,
      lastScanAt: server.lastScanAt,
      playerCount: server.playerCount ?? 0,
      maxPlayers: server.maxPlayers ?? 64,
      fps: server.fps ?? 0,
      resourceCount: server.resources?.length ?? 0,
      hasAgent,
      pairing,
      agent: pairedDevice || null,
      settings: server.settings || {},
      resources: server.resources.map((r: any) => ({
        name: r.resourceName,
        path: r.relativePath,
        dependencies: r.dependencies as string[],
      })),
    };
  });

  // Rename a server (org-scoped)
  fastify.patch('/api/servers/:serverId', async (request, reply) => {
    requireAuth(request, reply);
    const params = z.object({ serverId: z.string() }).parse(request.params);
    const body = z.object({
      name: z.string().trim().min(1).max(100),
    }).parse(request.body);

    const server = await assertServerAccess(request, reply, params.serverId);
    if (!server) return;

    const updated = await prisma.server.update({
      where: { id: params.serverId },
      data: { name: body.name },
      select: { id: true, name: true },
    });

    await prisma.auditLog.create({
      data: {
        orgId: server.orgId,
        serverId: params.serverId,
        action: 'server.renamed',
        metadata: { from: server.name, to: body.name },
      },
    });

    return updated;
  });

  // ============================================
  // Chat
  // ============================================

  // Create chat thread
  fastify.post('/api/servers/:serverId/threads', async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({
      serverId: z.string(),
    }).parse(request.params);

    // Verify server belongs to user's org
    const server = await assertServerAccess(request, reply, params.serverId);
    if (!server) return;

    const body = z.object({
      title: z.string().optional(),
    }).parse(request.body);

    const thread = await prisma.chatThread.create({
      data: {
        serverId: params.serverId,
        userId: user.userId,
        title: body.title,
        status: 'open',
      },
    });

    return thread;
  });

  // List all threads for an org (used by web dashboard)
  fastify.get('/api/threads', async (request, reply) => {
    const user = requireAuth(request, reply);
    const orgId = user.orgId;
    const url = request.url as string;
    const serverId = new URLSearchParams(url.split('?')[1] || '').get('serverId');

    const threads = await prisma.chatThread.findMany({
      where: serverId
        ? { serverId, server: { orgId } }
        : { server: { orgId } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: { server: { select: { id: true, name: true } } },
    });

    return threads;
  });

  // Get threads for a server
  fastify.get('/api/servers/:serverId/threads', async (request, reply) => {
    const user = requireAuth(request, reply);
    const orgId = user.orgId;
    const params = z.object({
      serverId: z.string(),
    }).parse(request.params);

    if (!await assertServerAccess(request, reply, params.serverId)) return;

    const threads = await prisma.chatThread.findMany({
      where: { serverId: params.serverId, server: { orgId } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return threads;
  });

  // Delete a thread
  fastify.delete('/api/threads/:threadId', async (request, reply) => {
    requireAuth(request, reply);
    const params = z.object({ threadId: z.string() }).parse(request.params);

    const thread = await assertThreadAccess(request, reply, params.threadId);
    if (!thread) return;

    await prisma.chatMessage.deleteMany({ where: { threadId: params.threadId } });
    await prisma.chatThread.delete({ where: { id: params.threadId } });
    return { ok: true };
  });

  // Get messages in a thread
  fastify.get('/api/threads/:threadId/messages', async (request, reply) => {
    requireAuth(request, reply);
    const params = z.object({
      threadId: z.string(),
    }).parse(request.params);

    const thread = await assertThreadAccess(request, reply, params.threadId);
    if (!thread) return;

    const messages = await prisma.chatMessage.findMany({
      where: { threadId: params.threadId },
      orderBy: { createdAt: 'asc' },
    });

    return messages;
  });

  // Get or create one persistent thread per server/user
  fastify.get('/api/servers/:serverId/thread', async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({ serverId: z.string() }).parse(request.params);
    const userId = user.userId;

    const server = await assertServerAccess(request, reply, params.serverId);
    if (!server) return;

    let thread = await prisma.chatThread.findFirst({
      where: { serverId: params.serverId, userId },
      orderBy: { createdAt: 'asc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!thread) {
      thread = await prisma.chatThread.create({
        data: { serverId: params.serverId, userId, title: 'Chat', status: 'open' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    }
    return thread;
  });

  // ============================================
  // Chat
  // ============================================

  // Get or create a thread for a server. The :userId path segment is kept for
  // backwards compatibility with older dashboard builds but IGNORED — the
  // caller identity always comes from the verified token.
  fastify.get('/api/servers/:serverId/threads/:userId', async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({ serverId: z.string(), userId: z.string() }).parse(request.params);

    const server = await assertServerAccess(request, reply, params.serverId);
    if (!server) return;

    const cacheKey = `thread:${params.serverId}:${user.userId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    let thread = await prisma.chatThread.findFirst({
      where: { serverId: params.serverId, userId: user.userId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
      orderBy: { createdAt: 'desc' },
    });
    if (!thread) {
      thread = await prisma.chatThread.create({ data: { serverId: params.serverId, userId: user.userId, title: 'General Chat', status: 'open' }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
    }
    cache.set(cacheKey, thread, 60000);
    return thread;
  });

  // Non-streaming chat endpoint — expensive (LLM calls), so per-user throttle
  // is much tighter than the global IP limit. hook: 'preHandler' is required:
  // the plugin default (onRequest) would run BEFORE authPlugin's preHandler,
  // so authUser would not exist yet and every user would share one IP bucket.
  fastify.post(
    '/api/threads/:threadId/chat',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
          keyGenerator: perUserKey,
          hook: 'preHandler',
        },
      },
    },
    async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({ threadId: z.string() }).parse(request.params);
    const body = z.object({
      message: z.string().min(1).max(10000),
      userId: z.string().optional(),
      // Skill chips from the dashboard — forwarded into the chat context so
      // the model sees which skills the user enabled for this message.
      selectedSkills: z.array(z.string()).optional(),
    }).parse(request.body);
    // Client-sent userId values are ignored — identity comes from the token.
    void body.userId;
    const userId = user.userId;
    let thread = await prisma.chatThread.findFirst({
      where: { id: params.threadId, server: { orgId: user.orgId } },
      include: { server: true, messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
    });
    if (!thread && /^thread_[a-z0-9]{14,}$/i.test(params.threadId)) {
      // Legacy synthetic ids ("thread_<serverId>") — resolve the underlying
      // server through the org scope so cross-org access still fails.
      const legacyServerId = params.threadId.replace(/^thread_/, '');
      const server = await prisma.server.findFirst({
        where: { id: legacyServerId, orgId: user.orgId },
      });
      if (!server) return reply.status(404).send({ error: 'Not found' });
      thread = (await prisma.chatThread.create({ data: { id: params.threadId, serverId: legacyServerId, userId, title: 'New Chat', status: 'open' }, include: { server: true, messages: { orderBy: { createdAt: 'asc' }, take: 50 } } })) as any;
    }
    if (!thread) return reply.status(404).send({ error: 'Not found' });
    const gateway = (fastify as any).agentGateway;
    if (!gateway) return reply.status(500).send({ error: 'Agent gateway not initialized' });
    const chunks: string[] = [];
    let lastError: string | undefined;
    try {
      await handleChatMessage(
        gateway,
        thread!.serverId,
        params.threadId,
        userId,
        body.message,
        (chunk: any) => {
          if (chunk.type === 'text') chunks.push(chunk.content);
          if (chunk.type === 'error') lastError = chunk.content;
        },
        body.selectedSkills,
      );
    } catch (error) {
      // Org cost caps are enforced before the first LLM call and re-checked
      // between tool-loop iterations. Surface them as a typed 402.
      if (error instanceof ChatCapError) {
        return reply.status(402).send({
          error: 'cost_cap_exceeded',
          scope: error.scope,
          limit: error.limit,
        });
      }
      throw error;
    }
    cache.invalidate(`threads:${thread!.serverId}:${userId}`);
    cache.invalidate(`thread:${thread!.serverId}:${userId}`);
    if (!chunks.length) {
      if (lastError) return reply.send({ threadId: params.threadId, response: lastError });
      const agentConnected = gateway.isConnected(thread!.serverId);
      if (!agentConnected) return reply.send({ threadId: params.threadId, response: 'The AI has no response because no agent is connected to this server. Pair your FiveM server first to enable file operations and full AI assistance.' });
      return reply.send({ threadId: params.threadId, response: 'The AI did not return a response. Please try again.' });
    }
    return { threadId: params.threadId, response: chunks.join('') };
    }
  );

  // ============================================
  // Players
  // ============================================

  fastify.get('/api/servers/:serverId/players', async (request, reply) => {
    const params = z.object({ serverId: z.string() }).parse(request.params);
    const server = await assertServerAccess(request, reply, params.serverId);
    if (!server) return;
    const cached = cache.get(`players:${params.serverId}`);
    if (cached) return cached;
    const agentGateway = (fastify as any).agentGateway;
    if (!agentGateway || !agentGateway.isConnected(params.serverId)) {
      return reply.status(400).send({ error: 'Agent not connected' });
    }
    try {
      const result = await agentGateway.sendCommand(params.serverId, 'fivem.listPlayers', txAdminArgs(server.settings), 10000);
      // Agent dialect: { players: [...], source: 'txadmin' | 'none' }.
      // Tolerate bare arrays from older agents.
      const livePlayers: any[] = Array.isArray(result)
        ? result
        : Array.isArray(result?.players) ? result.players : [];

      // Persist live players so ban state survives restarts. The Player model
      // has NO unique constraint on (serverId, playerId) — verified against
      // packages/db/prisma/schema.prisma — so resolve-or-create inside a
      // transaction instead of prisma.player.upsert.
      if (livePlayers.length > 0) {
        await prisma.$transaction(async (tx) => {
          for (const p of livePlayers) {
            const identifier = String(p?.playerId ?? p?.id ?? p?.identifier ?? '').trim();
            if (!identifier) continue;
            const name = String(p?.name ?? p?.username ?? identifier);
            const license = typeof p?.license === 'string' && p.license ? p.license : null;
            const existing = await tx.player.findFirst({
              where: { serverId: params.serverId, playerId: identifier },
              select: { id: true },
            });
            if (existing) {
              await tx.player.update({
                where: { id: existing.id },
                data: { name, ...(license ? { license } : {}) },
              });
            } else {
              await tx.player.create({
                data: { serverId: params.serverId, playerId: identifier, name, license },
              });
            }
          }
        });
      }

      // Merge live presence with stored ban status.
      const dbPlayers = await prisma.player.findMany({
        where: { serverId: params.serverId },
        select: { id: true, playerId: true, name: true, isBanned: true, banReason: true, bannedAt: true },
      });
      const byIdentifier = new Map(dbPlayers.map((row: any) => [row.playerId, row]));
      const enriched = livePlayers
        .map((p: any) => {
          const identifier = String(p?.playerId ?? p?.id ?? p?.identifier ?? '').trim();
          const row = byIdentifier.get(identifier) || null;
          return {
            ...p,
            playerId: identifier,
            dbPlayerId: row?.id,
            isBanned: row?.isBanned ?? false,
            banReason: row?.banReason ?? null,
            bannedAt: row?.bannedAt ?? null,
          };
        })
        .filter((p: any) => p.playerId);

      cache.set(`players:${params.serverId}`, enriched, 15000);
      return enriched;
    } catch (e: any) {
      const msg = e?.message || (typeof e === 'string' ? e : 'Failed to fetch players');
      return reply.status(500).send({ error: msg });
    }
  });

  // ============================================
  // Agent Status
  // ============================================

  fastify.get('/api/agent/status', async (request, reply) => {
    const user = requireAuth(request, reply);
    const gateway = (fastify as any).agentGateway;
    if (!gateway) return { connectedServers: [], total: 0 };
    // Only report agent connections for servers owned by the caller's org.
    const orgServers = await prisma.server.findMany({
      where: { orgId: user.orgId },
      select: { id: true },
    });
    const orgServerIds = new Set(orgServers.map((s) => s.id));
    const servers = gateway.getConnectedServers().filter((id: string) => orgServerIds.has(id));
    return { connectedServers: servers, total: servers.length };
  });

  // WebSocket endpoint for client status subscriptions.
  // Transitional auth: `?token=<bearer>` present → payload scoped to the
  // caller's org. No token + AUTH_ALLOW_ANON (default true) → legacy global
  // broadcast preserved during transition. No token + flag off → rejected.
  fastify.register(async function (fastify) {
    fastify.get('/ws/status', { websocket: true }, async (connection, req) => {
      const gateway = (fastify as any).agentGateway;
      if (!gateway) {
        connection.close();
        return;
      }

      let scopedServerIds: Set<string> | null = null; // null = unscoped broadcast

      try {
        const token = new URL(req.url, 'http://internal').searchParams.get('token');
        if (token) {
          const user = await verifyBearerToken(token);
          if (!user) {
            connection.close();
            return;
          }
          const orgServers = await prisma.server.findMany({
            where: { orgId: user.orgId },
            select: { id: true },
          });
          scopedServerIds = new Set(orgServers.map((s) => s.id));
        } else if (!authAllowAnon()) {
          // No token and the transitional anon window is closed.
          connection.close();
          return;
        }
      } catch (err) {
        console.error('[ws/status] handshake failed:', err);
        connection.close();
        return;
      }

      const sendStatus = () => {
        const all = gateway.getConnectedServers() as string[];
        const servers = scopedServerIds ? all.filter((id) => scopedServerIds!.has(id)) : all;
        try {
          connection.send(JSON.stringify({
            type: 'agent.status',
            connectedServers: servers,
            total: servers.length,
          }));
        } catch {
          // socket already closing
        }
      };

      // Send initial status
      sendStatus();

      // Push updates when agents connect/disconnect.
      const onStatusChanged = () => sendStatus();
      gateway.statusListeners.add(onStatusChanged);

      // Listen for disconnects
      connection.on('close', () => {
        gateway.statusListeners.delete(onStatusChanged);
      });
    });
  });

  // ============================================
  // Audit Logs
  // ============================================

  fastify.post('/api/audit', async (request, reply) => {
    const user = requireAuth(request, reply);
    const orgId = user.orgId;
    const body = z.object({
      action: z.string(),
      serverId: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    }).parse(request.body);

    await prisma.auditLog.create({
      data: {
        orgId,
        userId: user.userId,
        serverId: body.serverId,
        action: body.action,
        metadata: (body.metadata || {}) as any,
      },
    });

    return { ok: true };
  });

  fastify.get('/api/audit', async (request, reply) => {
    const user = requireAuth(request, reply);
    const orgId = user.orgId;
    const { searchParams } = new URL(request.url, 'http://localhost');
    const filter = searchParams.get('filter') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    const logs = await (prisma.auditLog as any).findMany({
      where: filter
        ? { orgId, action: { contains: filter } }
        : { orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        server: { select: { id: true, name: true } },
      },
    });

    return { logs };
  });

  // ============================================
  // Cost Controls / Usage
  // ============================================

  fastify.get('/api/usage', async (request, reply) => {
    const user = requireAuth(request, reply);
    const orgId = user.orgId;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const empty = {
      totalMessages: 0,
      messagesLast7Days: 0,
      activeConversations: 0,
      totalTokensIn: 0,
      totalTokensOut: 0,
      totalCostUsd: 0,
      modelBreakdown: [] as Array<{ model: string; tokensIn: number; tokensOut: number; costUsd: number; entries: number }>,
      dailyTrend: [] as Array<{ day: string; tokensIn: number; tokensOut: number; costUsd: number }>,
      plan: 'starter',
      limits: { maxTokensPerDay: 50000, maxConcurrentThreads: 5, monthlyCostCap: 20 },
    };

    const num = (v: unknown) => {
      if (v == null) return 0;
      if (typeof v === 'bigint') return Number(v);
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    try {
      const org = await prisma.organization.findUnique({ where: { id: orgId } });

      const usageStats: any = await prisma.$queryRaw`
        SELECT
          COALESCE(SUM("tokensIn"), 0) as total_tokens_in,
          COALESCE(SUM("tokensOut"), 0) as total_tokens_out,
          COALESCE(SUM("costUsd"), 0) as total_cost_usd
        FROM "usage_logs"
        WHERE "orgId" = ${orgId}
          AND "createdAt" >= ${thirtyDaysAgo}
      `;

      const modelBreakdown: any = await prisma.$queryRaw`
        SELECT
          "model",
          COALESCE(SUM("tokensIn"), 0) as tokens_in,
          COALESCE(SUM("tokensOut"), 0) as tokens_out,
          COALESCE(SUM("costUsd"), 0) as cost_usd,
          COUNT(*)::int as entries
        FROM "usage_logs"
        WHERE "orgId" = ${orgId}
          AND "createdAt" >= ${thirtyDaysAgo}
        GROUP BY "model"
        ORDER BY cost_usd DESC
      `;

      const dailyTrend: any = await prisma.$queryRaw`
        SELECT
          to_char(DATE("createdAt"), 'YYYY-MM-DD') as day,
          COALESCE(SUM("tokensIn"), 0) as tokens_in,
          COALESCE(SUM("tokensOut"), 0) as tokens_out,
          COALESCE(SUM("costUsd"), 0) as cost_usd
        FROM "usage_logs"
        WHERE "orgId" = ${orgId}
          AND "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY day ASC
      `;

      const msgStats: any = await prisma.$queryRaw`
        SELECT
          COUNT(*)::int as total_messages,
          COUNT(CASE WHEN cm."createdAt" >= ${sevenDaysAgo} THEN 1 END)::int as messages_last_7d,
          COUNT(DISTINCT cm."threadId")::int as active_conversations
        FROM "chat_messages" cm
        WHERE cm."threadId" IN (
          SELECT t.id FROM "chat_threads" t
          INNER JOIN "servers" s ON s.id = t."serverId"
          WHERE s."orgId" = ${orgId}
        )
      `;

      const byDay: Record<string, { day: string; tokensIn: number; tokensOut: number; costUsd: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        byDay[key] = { day: key, tokensIn: 0, tokensOut: 0, costUsd: 0 };
      }
      for (const row of dailyTrend || []) {
        const key = String(row.day).slice(0, 10);
        if (byDay[key]) {
          byDay[key] = {
            day: key,
            tokensIn: num(row.tokens_in),
            tokensOut: num(row.tokens_out),
            costUsd: num(row.cost_usd),
          };
        }
      }

      // Real estimated spend from Usage.costUsd (written per LLM call by the
      // chat session) against the org's configured caps.
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const monthSpend = await prisma.usage.aggregate({
        where: { orgId, createdAt: { gte: monthStart } },
        _sum: { costUsd: true },
      });

      return {
        totalMessages: num(msgStats[0]?.total_messages),
        messagesLast7Days: num(msgStats[0]?.messages_last_7d),
        activeConversations: num(msgStats[0]?.active_conversations),
        totalTokensIn: num(usageStats[0]?.total_tokens_in),
        totalTokensOut: num(usageStats[0]?.total_tokens_out),
        totalCostUsd: num(usageStats[0]?.total_cost_usd),
        modelBreakdown: (modelBreakdown || []).map((m: any) => ({
          model: m.model,
          tokensIn: num(m.tokens_in),
          tokensOut: num(m.tokens_out),
          costUsd: num(m.cost_usd),
          entries: num(m.entries),
        })),
        dailyTrend: Object.values(byDay),
        plan: org?.plan_tier || 'starter',
        limits: {
          maxTokensPerDay: 50000,
          maxConcurrentThreads: 5,
          monthlyCostCap:
            org?.monthly_cost_cap_usd != null ? Number(org.monthly_cost_cap_usd) : 20,
          monthSpendUsd: Number(monthSpend._sum.costUsd ?? 0),
        },
        subscription: {
          note: 'All AI usage included in monthly subscription',
          plans: [
            { id: 'starter', name: 'Starter', price: '$0', features: '1 Server, 100 actions' },
            { id: 'pro', name: 'Pro', price: '$19', features: '5 Servers, 1,000 actions' },
            { id: 'enterprise', name: 'Enterprise', price: '$49', features: 'Unlimited everything' },
          ],
        },
      };
    } catch (err) {
      console.error('[usage] query failed:', err);
      return empty;
    }
  });

  // ============================================
  // Settings
  // ============================================

  fastify.get('/api/servers/:serverId/settings', async (request, reply) => {
    requireAuth(request, reply);
    const params = z.object({ serverId: z.string() }).parse(request.params);
    const server = await assertServerAccess(request, reply, params.serverId);
    if (!server) return;
    return { settings: (server as any).settings || {}, serverDir: server.rootLabel || '' };
  });

  fastify.put('/api/servers/:serverId/settings', async (request, reply) => {
    requireAuth(request, reply);
    const params = z.object({ serverId: z.string() }).parse(request.params);
    if (!await assertServerAccess(request, reply, params.serverId)) return;
    const body = z.object({ settings: z.record(z.unknown()).optional(), serverDir: z.string().optional() }).parse(request.body);
    const updates: any = {};
    if (body.settings !== undefined) updates.settings = body.settings;
    if (body.serverDir !== undefined) updates.rootLabel = sanitizeRelativePath(body.serverDir) ?? null;
    const server = await prisma.server.update({ where: { id: params.serverId }, data: updates, select: { settings: true, rootLabel: true } });
    return { settings: server.settings, serverDir: server.rootLabel };
  });

  // ============================================
  // Resource Config Editor
  // ============================================

  // Read a resource's manifest/config file
  fastify.get('/api/servers/:serverId/resources/:resourceName/config', async (request, reply) => {
    const authUser = await requireAuth(request, reply);
    if (!authUser) return;
    const params = z.object({
      serverId: z.string(),
      resourceName: z.string(),
    }).parse(request.params);

    const server = await prisma.server.findFirst({
      where: { id: params.serverId, orgId: authUser.orgId },
      include: { resources: { where: { resourceName: params.resourceName } } },
    });

    if (!server) return reply.status(404).send({ error: 'Not found' });
    const resource = server.resources[0];
    if (!resource) return reply.status(404).send({ error: 'Not found' });

    const agentGateway = (fastify as any).agentGateway;
    if (!agentGateway || !agentGateway.isConnected(params.serverId)) {
      return reply.status(400).send({ error: 'Agent not connected' });
    }

    try {
      const manifestPath = sanitizeRelativePath(
        resource.manifestPath || `resources/${resource.resourceName}/fxmanifest.lua`
      );
      if (!manifestPath) {
        return reply.status(400).send({ error: 'Invalid resource manifest path' });
      }
      const result = await agentGateway.sendCommand(
        params.serverId,
        'fs.read',
        { path: manifestPath, maxBytes: 50000 },
        15000
      );
      return {
        resourceName: resource.resourceName,
        relativePath: resource.relativePath,
        manifestPath,
        content: result.content,
        sha256: result.sha256,
        size: result.size,
        modifiedAt: result.modifiedAt,
      };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message || 'Failed to read config' });
    }
  });

  // Save a resource's manifest/config file
  fastify.post('/api/servers/:serverId/resources/:resourceName/config', async (request, reply) => {
    const authUser = await requireAuth(request, reply);
    if (!authUser) return;
    const params = z.object({
      serverId: z.string(),
      resourceName: z.string(),
    }).parse(request.params);
    const body = z.object({
      content: z.string().min(1),
      expectedSha256: z.string().optional(),
    }).parse(request.body);

    const server = await prisma.server.findFirst({
      where: { id: params.serverId, orgId: authUser.orgId },
      include: { resources: { where: { resourceName: params.resourceName } } },
    });

    if (!server) return reply.status(404).send({ error: 'Not found' });
    const resource = server.resources[0];
    if (!resource) return reply.status(404).send({ error: 'Not found' });

    // Guard the relayed path against traversal before it reaches the agent.
    const safeManifestPath = sanitizeRelativePath(
      resource.manifestPath || `resources/${resource.resourceName}/fxmanifest.lua`
    );
    if (!safeManifestPath) {
      return reply.status(400).send({ error: 'Invalid resource manifest path' });
    }

    const agentGateway = (fastify as any).agentGateway;
    if (!agentGateway || !agentGateway.isConnected(params.serverId)) {
      return reply.status(400).send({ error: 'Agent not connected' });
    }

    try {
      const result = await agentGateway.sendCommand(
        params.serverId,
        'fs.write',
        { path: safeManifestPath, content: body.content },
        15000
      );

      if (!result || !result.success) {
        return reply.status(500).send({ error: 'Failed to write config file' });
      }

      return { success: true, sha256: result.sha256 };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message || 'Failed to save config' });
    }
  });

  // ============================================
  // Changes
  // ============================================

  // Get pending changes for a server
  fastify.get('/api/servers/:serverId/changes', async (request, reply) => {
    requireAuth(request, reply);
    const params = z.object({
      serverId: z.string(),
    }).parse(request.params);

    if (!await assertServerAccess(request, reply, params.serverId)) return;

    const changes = await prisma.change.findMany({
      where: { serverId: params.serverId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return changes;
  });

  // Get a specific change
  fastify.get('/api/changes/:changeId', async (request, reply) => {
    requireAuth(request, reply);
    const params = z.object({
      changeId: z.string(),
    }).parse(request.params);

    const change = await assertChangeAccess(request, reply, params.changeId);
    if (!change) return;

    return change;
  });

  // Cancel (roll back) a pending change
  fastify.post('/api/changes/:changeId/cancel', async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({
      changeId: z.string(),
    }).parse(request.params);

    const change = await assertChangeAccess(request, reply, params.changeId);
    if (!change) return;

    if (change.status !== 'pending') {
      return reply.status(400).send({ error: 'Only pending changes can be cancelled' });
    }

    await prisma.change.update({
      where: { id: params.changeId },
      data: {
        status: 'rolled_back',
        rolledBackAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        orgId: user.orgId,
        serverId: change.serverId,
        userId: user.userId,
        action: 'change.rolled_back',
        metadata: { changeId: change.id, filesTouched: change.filesTouched },
      },
    });

    return { status: 'cancelled', changeId: change.id };
  });

  // Apply a change (triggers agent action)
  fastify.post('/api/changes/:changeId/apply', async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({
      changeId: z.string(),
    }).parse(request.params);

    const change = await assertChangeAccess(request, reply, params.changeId);
    if (!change) return;

    if (change.status !== 'pending') {
      return reply.status(400).send({ error: 'Change is not pending' });
    }

    // Update status to approved
    await prisma.change.update({
      where: { id: params.changeId },
      data: {
        status: 'approved',
        approvedByUserId: user.userId,
        approvedAt: new Date(),
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        orgId: user.orgId,
        serverId: change.serverId,
        userId: user.userId,
        action: 'change.approved',
        metadata: { changeId: change.id, filesTouched: change.filesTouched },
      },
    });

    // Send apply command to agent via gateway
    const agentGateway = (fastify as any).agentGateway as AgentGateway;
    if (!agentGateway.isConnected(change.serverId)) {
      return reply.status(400).send({ error: 'Agent is not connected' });
    }

    // Get the change details with files
    const changeWithFiles = await prisma.change.findUnique({
      where: { id: params.changeId },
    });

    if (!changeWithFiles) {
      return reply.status(404).send({ error: 'Change not found' });
    }

    // Build the patch from the stored diff and filesTouched metadata
    const touchedFiles = Array.isArray(changeWithFiles.filesTouched)
      ? (changeWithFiles.filesTouched as string[])
      : [];
    const parsed = parseDiffToPatch(changeWithFiles.diff, touchedFiles);

    // Guard every relayed file path against traversal before it reaches the agent.
    const rejectedPaths: string[] = [];
    const files: Array<{ path: string; newContent: string; expectedSha256?: string }> = [];
    for (const f of parsed) {
      const safe = sanitizeRelativePath(f.path);
      if (safe) {
        files.push({ ...f, path: safe });
      } else {
        rejectedPaths.push(f.path);
      }
    }

    if (rejectedPaths.length > 0) {
      await prisma.change.update({
        where: { id: params.changeId },
        data: { status: 'failed', applyResult: { error: `Unsafe paths rejected: ${rejectedPaths.join(', ')}` } },
      });
      return reply.status(400).send({ error: `Change contains unsafe file paths and was not applied` });
    }

    if (files.length === 0) {
      return reply.status(400).send({ error: 'No files to apply in change' });
    }

    try {
      await agentGateway.sendCommand(
        change.serverId,
        'fs.applyPatch',
        {
          changeId: params.changeId,
          files,
        },
        60000
      );

      await prisma.change.update({
        where: { id: params.changeId },
        data: {
          status: 'applied',
          appliedAt: new Date(),
        },
      });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          orgId: user.orgId,
          serverId: change.serverId,
          userId: user.userId,
          action: 'change.applied',
          metadata: { changeId: change.id, filesApplied: touchedFiles },
        },
      });

      return {
        status: 'applied',
        changeId: change.id,
        message: 'Change applied successfully',
      };
    } catch (error: any) {
      await prisma.change.update({
        where: { id: params.changeId },
        data: {
          status: 'failed',
          applyResult: { error: error.message },
        },
      });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          orgId: user.orgId,
          serverId: change.serverId,
          userId: user.userId,
          action: 'change.failed',
          metadata: { changeId: change.id, error: error.message },
        },
      });

      return reply.status(500).send({ error: `Failed to apply change: ${error.message}` });
    }
  });

  // ============================================
  // Resources (Index)
  // ============================================

  // Get resources for a server
  fastify.get('/api/servers/:serverId/resources', async (request, reply) => {
    requireAuth(request, reply);
    const params = z.object({
      serverId: z.string(),
    }).parse(request.params);

    if (!await assertServerAccess(request, reply, params.serverId)) return;

    const resources = await prisma.resourceIndex.findMany({
      where: { serverId: params.serverId },
      orderBy: { resourceName: 'asc' },
    });

    return resources;
  });

  // Trigger a scan
  fastify.post('/api/servers/:serverId/scan', async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({
      serverId: z.string(),
    }).parse(request.params);

    const server = await assertServerAccess(request, reply, params.serverId);
    if (!server) return;

    if (server.status !== 'online') {
      return reply.status(400).send({ error: 'Server agent is not online' });
    }

    // Send scan command to agent via gateway
    const agentGateway = (fastify as any).agentGateway as AgentGateway;
    if (!agentGateway.isConnected(params.serverId)) {
      return reply.status(400).send({ error: 'Agent is not connected' });
    }

    try {
      const result = await agentGateway.sendCommand(
        params.serverId,
        'scan.resources',
        {},
        60000
      );

      // Persist scan results to database
      if (result && Array.isArray(result.resources)) {
        for (const resource of result.resources) {
          await prisma.resourceIndex.upsert({
            where: {
              serverId_resourceName: {
                serverId: params.serverId,
                resourceName: resource.name,
              },
            },
            update: {
              relativePath: resource.relativePath,
              manifestPath: resource.manifestPath,
              dependencies: resource.dependencies,
              provides: resource.provides,
              files: resource.files,
              lastScannedAt: new Date(),
            },
            create: {
              serverId: params.serverId,
              resourceName: resource.name,
              relativePath: resource.relativePath,
              manifestPath: resource.manifestPath,
              dependencies: resource.dependencies,
              provides: resource.provides,
              files: resource.files,
            },
          });
        }

        // Update server framework and last scan time
        await prisma.server.update({
          where: { id: params.serverId },
          data: {
            framework: result.framework || 'unknown',
            lastScanAt: new Date(),
          },
        });
      }

      return {
        status: 'scan_completed',
        message: 'Scan completed and resources indexed',
        framework: result.framework,
        resourceCount: result.resources?.length || 0,
      };
    } catch (error: any) {
      return reply.status(500).send({ error: `Scan failed: ${error.message}` });
    }
  });

  // Direct sync of scanned resources from desktop agent
  fastify.post('/api/servers/:serverId/resources/sync', async (request, reply) => {
    requireAuth(request, reply);
    const params = z.object({ serverId: z.string() }).parse(request.params);
    if (!await assertServerAccess(request, reply, params.serverId)) return;
    const body = z.object({
      framework: z.string().optional(),
      resources: z.array(z.object({
        name: z.string(),
        relativePath: z.string(),
        manifestPath: z.string().optional(),
        dependencies: z.array(z.string()).optional(),
        provides: z.array(z.string()).optional(),
        files: z.array(z.string()).optional(),
      })),
    }).parse(request.body);

    for (const resource of body.resources) {
      await prisma.resourceIndex.upsert({
        where: {
          serverId_resourceName: {
            serverId: params.serverId,
            resourceName: resource.name,
          },
        },
        update: {
          relativePath: resource.relativePath,
          manifestPath: resource.manifestPath || '',
          dependencies: resource.dependencies || [],
          provides: resource.provides || [],
          files: resource.files || [],
          lastScannedAt: new Date(),
        },
        create: {
          serverId: params.serverId,
          resourceName: resource.name,
          relativePath: resource.relativePath,
          manifestPath: resource.manifestPath || '',
          dependencies: resource.dependencies || [],
          provides: resource.provides || [],
          files: resource.files || [],
        },
      });
    }

    await prisma.server.update({
      where: { id: params.serverId },
      data: {
        framework: body.framework || 'unknown',
        lastScanAt: new Date(),
        status: 'online',
      },
    });

    return { ok: true, synced: body.resources.length, framework: body.framework };
  });

  // Console tail endpoint
  fastify.get('/api/servers/:serverId/console', async (request, reply) => {
    requireAuth(request, reply);
    const params = z.object({ serverId: z.string() }).parse(request.params);

    const server = await assertServerAccess(request, reply, params.serverId);
    if (!server) return;
    if (server.status !== 'online') return reply.status(400).send({ error: 'Agent not connected' });

    const agentGateway = (fastify as any).agentGateway as AgentGateway;
    if (!agentGateway.isConnected(params.serverId)) {
      return reply.status(400).send({ error: 'Agent is not connected' });
    }

    try {
      const result = await agentGateway.sendCommand(
        params.serverId,
        'fivem.tailConsole',
        { lines: 200 },
        15000
      );
      return result;
    } catch (e) {
      return reply.status(500).send({ error: e instanceof Error ? e.message : 'Failed to get console' });
    }
  });

  // Restart a server (sends command to agent)
  fastify.post('/api/servers/:serverId/restart', async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({
      serverId: z.string(),
    }).parse(request.params);

    const server = await assertServerAccess(request, reply, params.serverId);
    if (!server) return;

    if (server.status !== 'online') {
      return reply.status(400).send({ error: 'Server agent is not online' });
    }

    const agentGateway = (fastify as any).agentGateway as AgentGateway;
    if (!agentGateway.isConnected(params.serverId)) {
      return reply.status(400).send({ error: 'Agent is not connected' });
    }

    try {
      await agentGateway.sendCommand(
        params.serverId,
        'fivem.restartServer',
        txAdminArgs(server.settings),
        30000
      );
      return { status: 'restart_sent' };
    } catch (error: any) {
      return reply.status(500).send({ error: `Restart failed: ${error.message}` });
    }
  });

  // ============================================
  // Agent Pairing
  // ============================================

  // Claim pairing code (called by agent) — unauthenticated endpoint, so the
  // brute-force surface is throttled per IP.
  fastify.post(
    '/api/pairing/claim',
    {
      config: {
        rateLimit: { max: 10, timeWindow: '1 minute' }, // default keyGenerator = req.ip
      },
    },
    async (request, reply) => {
    const body = z.object({
      pairingCode: z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/),
      agentVersion: z.string(),
      platform: z.enum(['windows', 'linux', 'unknown']),
      rootLabel: z.string(),
    }).parse(request.body);

    const device = await prisma.agentDevice.findFirst({
      where: {
        pairingCode: body.pairingCode.toUpperCase(),
        status: 'pending',
      },
      include: { server: true },
    });

    if (!device) {
      return reply.status(404).send({ error: 'Invalid or already-used pairing code.' });
    }

    if (device.pairingExpiresAt && device.pairingExpiresAt < new Date()) {
      return reply.status(410).send({ error: 'Pairing code expired. Open the server in the dashboard to get a new one.' });
    }

    // Issue a one-time session token; only its sha256 hash is persisted so a
    // DB leak never exposes live agent credentials.
    const sessionToken = crypto.randomBytes(32).toString('base64url');
    const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

    await prisma.agentDevice.update({
      where: { id: device.id },
      data: {
        status: 'paired',
        agentVersion: body.agentVersion,
        platform: body.platform,
        lastHeartbeatAt: new Date(),
        pairingCode: null,
        pairingExpiresAt: null,
        pairingTokenHash: sessionTokenHash,
      },
    });

    await prisma.server.update({
      where: { id: device.serverId },
      data: {
        status: 'online',
        rootLabel: body.rootLabel || device.server.rootLabel,
      },
    });

    return {
      serverId: device.serverId,
      agentDeviceId: device.id,
      sessionToken,
      wsUrl: process.env.ORCHESTRATOR_WS_URL || 'ws://localhost:3001/ws/agent',
    };
    }
  );

  // Refresh pairing code for an unpaired server
  fastify.post('/api/servers/:serverId/pairing', async (request, reply) => {
    return refreshPairingHandler(request, reply);
  });

  // Alias for the same operation — the dashboard calls this path
  // (servers/[serverId]/page.tsx) and reads code/expiresAt at the top level.
  fastify.post('/api/servers/:serverId/regenerate-pairing', async (request, reply) => {
    return refreshPairingHandler(request, reply, { flatResponse: true });
  });

  // Revoke agent
  fastify.post('/api/servers/:serverId/revoke', async (request, reply) => {
    requireAuth(request, reply);
    const params = z.object({ serverId: z.string() }).parse(request.params);

    if (!await assertServerAccess(request, reply, params.serverId)) return;

    await prisma.agentDevice.updateMany({
      where: { serverId: params.serverId, status: 'paired' },
      data: { status: 'revoked', pairingTokenHash: null },
    });

    await prisma.server.update({
      where: { id: params.serverId },
      data: { status: 'offline' },
    });

    // Kill any live WS connection for this server immediately.
    const gateway = (fastify as any).agentGateway as AgentGateway | undefined;
    gateway?.forceDisconnect(params.serverId);

    return { success: true };
  });

  // ============================================
  // Players
  // ============================================

  fastify.post('/api/servers/:serverId/players/:playerId/ban', async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({
      serverId: z.string(),
      // Either a DB player id or the FiveM identifier ("steam:123…") — the
      // dashboard may hold either depending on how the list was loaded.
      playerId: z.string(),
    }).parse(request.params);
    const body = z.object({ reason: z.string().optional() }).parse(request.body);

    const server = await assertServerAccess(request, reply, params.serverId);
    if (!server) return;

    // Resolve by DB id first, then fall back to the raw identifier.
    let player = await prisma.player.findFirst({
      where: { id: params.playerId, serverId: params.serverId },
    });
    if (!player) {
      player = await prisma.player.findFirst({
        where: { playerId: params.playerId, serverId: params.serverId },
      });
    }
    if (!player) {
      return reply.status(404).send({ error: 'Player not found. Refresh the players list and try again.' });
    }

    const gateway = (fastify as any).agentGateway as AgentGateway;
    if (!gateway.isConnected(params.serverId)) {
      return reply.status(400).send({ error: 'Agent is not connected' });
    }
    if (!player.isBanned) {
      try {
        // Surface agent errors honestly — agents always reply now. txAdmin
        // config is relayed from Server.settings; when it's absent the agent
        // replies NOT_IMPLEMENTED naming exactly what is missing.
        await gateway.sendCommand(params.serverId, 'fivem.banPlayer', {
          identifier: player.playerId,
          reason: body.reason || 'Banned via NOX',
          ...txAdminArgs(server.settings),
        }, 10000);
      } catch (e: any) {
        const agentMsg = e?.message || (typeof e === 'string' ? e : JSON.stringify(e));
        if (e?.code === 'NOT_IMPLEMENTED') {
          return reply.status(502).send({
            error: 'txAdmin not configured for this server — set useTxAdmin/txadminUrl/txadminApiKey in server settings to enable bans',
          });
        }
        return reply.status(502).send({ error: `Ban failed on agent: ${agentMsg}` });
      }
    }

    const now = new Date();
    const updated = await prisma.player.update({
      where: { id: player.id },
      data: { isBanned: true, banReason: body.reason || 'Banned via NOX', bannedAt: now },
    });

    cache.invalidate(`players:${params.serverId}`);

    return { ...updated, bannedAt: now.toISOString() };
  });

  fastify.post('/api/servers/:serverId/players/:playerId/unban', async (request, reply) => {
    requireAuth(request, reply);
    const params = z.object({
      serverId: z.string(),
      playerId: z.string(),
    }).parse(request.params);

    const server = await assertServerAccess(request, reply, params.serverId);
    if (!server) return;

    // Resolve by DB id first, then fall back to the raw identifier.
    let player = await prisma.player.findFirst({
      where: { id: params.playerId, serverId: params.serverId },
    });
    if (!player) {
      player = await prisma.player.findFirst({
        where: { playerId: params.playerId, serverId: params.serverId },
      });
    }
    if (!player) {
      return reply.status(404).send({ error: 'Player not found. Refresh the players list and try again.' });
    }

    const gateway = (fastify as any).agentGateway as AgentGateway;
    if (!gateway.isConnected(params.serverId)) {
      return reply.status(400).send({ error: 'Agent is not connected' });
    }
    // Mirror the ban route's guard: don't ask the agent to lift a ban that
    // isn't recorded as active.
    if (player.isBanned) {
      try {
        // Surface agent errors honestly — agents always reply now. txAdmin
        // config is relayed from Server.settings.
        await gateway.sendCommand(params.serverId, 'fivem.unbanPlayer', {
          identifier: player.playerId,
          ...txAdminArgs(server.settings),
        }, 10000);
      } catch (e: any) {
        if (e?.code === 'NOT_IMPLEMENTED') {
          return reply.status(502).send({
            error: 'txAdmin not configured for this server — set useTxAdmin/txadminUrl/txadminApiKey in server settings to enable unbans',
          });
        }
        return reply.status(502).send({ error: `Unban failed on agent: ${e?.message || JSON.stringify(e)}` });
      }
    }

    const updated = await prisma.player.update({
      where: { id: player.id },
      data: { isBanned: false, banReason: null, bannedAt: null },
    });

    cache.invalidate(`players:${params.serverId}`);

    return updated;
  });

  // ============================================
  // Global Changes (all servers)
  // ============================================

  fastify.get('/api/changes', async (request, reply) => {
    const user = requireAuth(request, reply);
    const orgId = user.orgId;
    const query = z.object({
      serverId: z.string().optional(),
      status: z.enum(['pending', 'applied', 'failed', 'rolled_back']).optional(),
      limit: z.string().optional().default('50'),
    }).parse(request.query);

    const where: any = { server: { orgId } };
    if (query.serverId) where.serverId = query.serverId;
    if (query.status) where.status = query.status;

    const changes = await prisma.change.findMany({
      where,
      include: { server: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(query.limit),
    });

    return changes.map((c: any) => ({
      ...c,
      serverName: c.server?.name,
      serverId: c.serverId,
    }));
  });

  // ============================================
  // Onboarding
  // ============================================

  fastify.get('/api/onboarding/status', async (request, reply) => {
    const user = requireAuth(request, reply);
    const org = await prisma.organization.findUnique({
      where: { id: user.orgId },
      select: { onboardedAt: true, name: true },
    });
    if (!org) return reply.status(404).send({ error: 'Organization not found' });
    return { onboarded: !!org.onboardedAt };
  });

  fastify.post('/api/onboarding/complete', async (request, reply) => {
    const user = requireAuth(request, reply);
    const body = z.object({
      name: z.string().min(1).max(100),
      framework: z.enum(['qbcore', 'esx', 'vRP', 'other']),
      hasServer: z.boolean(),
      goal: z.string().optional(),
    }).parse(request.body);

    await prisma.organization.update({
      where: { id: user.orgId },
      data: {
        name: body.name,
        onboardedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        orgId: user.orgId,
        userId: user.userId,
        action: 'onboarding.completed',
        metadata: { framework: body.framework, hasServer: body.hasServer },
      },
    });

    return { ok: true };
  });

  // ============================================
  // Batch Operations
  // ============================================

  // Batch approve changes
  fastify.post('/api/changes/batch/apply', async (request, reply) => {
    const user = requireAuth(request, reply);
    const body = z.object({
      changeIds: z.array(z.string()),
      serverId: z.string().optional(),
    }).parse(request.body);

    const where: any = { id: { in: body.changeIds }, server: { orgId: user.orgId } };
    if (body.serverId) where.serverId = body.serverId;

    const changes = await prisma.change.findMany({
      where,
      include: { server: true },
    });

    const pendingChanges = changes.filter(c => c.status === 'pending');
    const results = {
      approved: [] as string[],
      skipped: [] as Array<{ id: string; reason: string }>,
    };

    for (const change of pendingChanges) {
      try {
        await prisma.change.update({
          where: { id: change.id },
          data: {
            status: 'approved',
            approvedByUserId: user.userId,
            approvedAt: new Date(),
          },
        });
        results.approved.push(change.id);

        await prisma.auditLog.create({
          data: {
            orgId: user.orgId,
            serverId: change.serverId,
            userId: user.userId,
            action: 'change.approved',
            metadata: { changeId: change.id, filesTouched: change.filesTouched, batchApproved: true },
          },
        });
      } catch (e) {
        results.skipped.push({ id: change.id, reason: (e as Error).message });
      }
    }

    return results;
  });

  // Batch cancel changes
  fastify.post('/api/changes/batch/cancel', async (request, reply) => {
    const user = requireAuth(request, reply);
    const body = z.object({
      changeIds: z.array(z.string()),
      serverId: z.string().optional(),
    }).parse(request.body);

    const where: any = { id: { in: body.changeIds }, server: { orgId: user.orgId } };
    if (body.serverId) where.serverId = body.serverId;

    const changes = await prisma.change.findMany({
      where,
      include: { server: true },
    });

    const pendingChanges = changes.filter(c => c.status === 'pending');
    const results = {
      cancelled: [] as string[],
      skipped: [] as Array<{ id: string; reason: string }>,
    };

    for (const change of pendingChanges) {
      try {
        await prisma.change.update({
          where: { id: change.id },
          data: {
            status: 'rolled_back',
            rolledBackAt: new Date(),
          },
        });
        results.cancelled.push(change.id);

        await prisma.auditLog.create({
          data: {
            orgId: user.orgId,
            serverId: change.serverId,
            userId: user.userId,
            action: 'change.rolled_back',
            metadata: { changeId: change.id, filesTouched: change.filesTouched, batchCancelled: true },
          },
        });
      } catch (e) {
        results.skipped.push({ id: change.id, reason: (e as Error).message });
      }
    }

    return results;
  });

  // ============================================
  // Billing / Org
  // ============================================

  fastify.get('/api/org', async (request, reply) => {
    const user = requireAuth(request, reply);
    const orgId = user.orgId;
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const actionCount = await prisma.change.count({
      where: { server: { orgId }, createdAt: { gte: monthStart } },
    });

    if (!org) {
      return {
        id: orgId,
        name: 'Development',
        planTier: 'starter',
        monthlyActionLimit: 500,
        monthlyActionCount: actionCount,
        monthlyCostCap: 20,
        createdAt: new Date(),
      };
    }

    return {
      id: org.id,
      name: org.name,
      planTier: org.plan_tier,
      monthlyActionLimit: org.monthly_action_limit,
      monthlyActionCount: actionCount,
      monthlyCostCap: org.monthly_cost_cap_usd != null ? Number(org.monthly_cost_cap_usd) : 20,
      createdAt: org.created_at,
    };
  });
  // Delete a server
  fastify.delete('/api/servers/:serverId', async (request, reply) => {
    requireAuth(request, reply);
    const params = z.object({ serverId: z.string() }).parse(request.params);
    const body = z.object({ confirmName: z.string() }).parse(request.body);

    const server = await assertServerAccess(request, reply, params.serverId);
    if (!server) return;

    if (server.name !== body.confirmName) {
      return reply.status(400).send({ error: 'Server name does not match. Please enter the exact server name to confirm deletion.' });
    }

    // Drop any live agent connection before cascading the delete.
    const gateway = (fastify as any).agentGateway as AgentGateway | undefined;
    gateway?.forceDisconnect(params.serverId);

    await prisma.server.delete({ where: { id: params.serverId } });
    return { ok: true };
  });

  // ============================================
  // Pairing helpers
  // ============================================

  /**
   * Shared implementation for POST /api/servers/:serverId/pairing and its
   * /regenerate-pairing alias. flatResponse=true returns { code, expiresAt }
   * at the top level (what the dashboard's regenerate handler expects);
   * the default wraps them as { pairing: { code, expiresAt } }.
   */
  async function refreshPairingHandler(
    request: FastifyRequest,
    reply: FastifyReply,
    opts: { flatResponse?: boolean } = {},
  ) {
    requireAuth(request, reply);
    const params = z.object({ serverId: z.string() }).parse(request.params);

    if (!await assertServerAccess(request, reply, params.serverId)) return;

    const server = await prisma.server.findUnique({
      where: { id: params.serverId },
      include: {
        agentDevices: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!server) return reply.status(404).send({ error: 'Not found' });

    if (server.agentDevices.some((d: any) => d.status === 'paired')) {
      return reply.status(400).send({ error: 'Server is already paired' });
    }

    const pending = server.agentDevices.find((d: any) => d.status === 'pending');
    const pairing = await issuePairing(server.id, pending?.id);
    return opts.flatResponse ? pairing : { pairing };
  }

  async function issuePairing(serverId: string, agentDeviceId?: string) {
    const code = generatePairingCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (agentDeviceId) {
      // NOTE: pairingTokenHash is intentionally NOT reset here. Re-pairing a
      // device must not silently invalidate a live session token without the
      // explicit revoke endpoint (which also force-disconnects).
      await prisma.agentDevice.update({
        where: { id: agentDeviceId },
        data: {
          status: 'pending',
          pairingCode: code,
          pairingExpiresAt: expiresAt,
          updatedAt: new Date(),
        },
      });
    } else {
      const device = await prisma.agentDevice.create({
        data: {
          serverId,
          status: 'pending',
          pairingCode: code,
          pairingExpiresAt: expiresAt,
          platform: 'unknown',
        },
      });
      return { code, expiresAt, agentDeviceId: device.id };
    }

    return { code, expiresAt };
  }
}

// Helper functions
function generatePairingCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part = () => Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `${part()}-${part()}`;
}
