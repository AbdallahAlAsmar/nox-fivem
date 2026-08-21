import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@fivem-ai/db';
import { authPlugin, requireAuth } from '../auth';
import type { AuthUser } from '../auth';
import { parseDiffToPatch } from './parseDiff';
import type { AgentGateway } from '../ws/agentGateway';
import { cache } from '../cache/cache';

export async function registerRoutes(fastify: FastifyInstance) {
  // Register auth plugin
  await fastify.register(authPlugin);
  // ============================================
  // Servers
  // ============================================

  // List servers for an org (public endpoint for development)
    fastify.get('/api/servers', async (request, reply) => {
      // In development, use default org if not authenticated
      const user = request.authUser;
      const orgId = user?.orgId || 'dev-org';

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
    // In development, allow creating servers without auth
    const user = request.authUser;
    const orgId = user?.orgId || 'dev-org';

    const body = z.object({
      name: z.string().min(1).max(100),
      directory: z.string().optional(),
    }).parse(request.body);

    // Create server
    const server = await prisma.server.create({
      data: {
        orgId: orgId,
        name: body.name,
        status: 'unpaired',
        framework: 'unknown',
        rootLabel: body.directory || null,
      },
    });

    const pairing = await issuePairing(server.id);

    return {
      server: {
        id: server.id,
        name: server.name,
        status: server.status,
      },
      pairing,
    };
  });

  // Get server details
  fastify.get('/api/servers/:serverId', async (request, reply) => {
    // In development, use default org if not authenticated
    const user = request.authUser;
    const orgId = user?.orgId || 'dev-org';
    const params = z.object({
      serverId: z.string(),
    }).parse(request.params);

    const server = await prisma.server.findFirst({
      where: { id: params.serverId, orgId },
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
      return reply.status(404).send({ error: 'Server not found' });
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
    const server = await prisma.server.findFirst({
      where: { id: params.serverId, orgId: user.orgId },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

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

  // Get threads for a server
  fastify.get('/api/servers/:serverId/threads', async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({
      serverId: z.string(),
    }).parse(request.params);

    // Verify server belongs to user's org
    const server = await prisma.server.findFirst({
      where: { id: params.serverId, orgId: user.orgId },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    const threads = await prisma.chatThread.findMany({
      where: { serverId: params.serverId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return threads;
  });

  // Get messages in a thread
  fastify.get('/api/threads/:threadId/messages', async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({
      threadId: z.string(),
    }).parse(request.params);

    // Verify thread belongs to user's org via server
    const thread = await prisma.chatThread.findFirst({
      where: {
        id: params.threadId,
        server: { orgId: user.orgId },
      },
    });

    if (!thread) {
      return reply.status(404).send({ error: 'Thread not found' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { threadId: params.threadId },
      orderBy: { createdAt: 'asc' },
    });

    return messages;
  });

  // ============================================
  // Chat
  // ============================================

  // Get or create a thread for a server and user
  fastify.get('/api/servers/:serverId/threads/:userId', async (request, reply) => {
    const params = z.object({ serverId: z.string(), userId: z.string() }).parse(request.params);
    const cached = cache.get(`thread:${params.serverId}:${params.userId}`);
    if (cached) return cached;
    let thread = await prisma.chatThread.findFirst({
      where: { serverId: params.serverId, userId: params.userId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
      orderBy: { createdAt: 'desc' },
    });
    if (!thread) {
      thread = await prisma.chatThread.create({ data: { serverId: params.serverId, userId: params.userId, title: 'General Chat', status: 'open' }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
    }
    cache.set(`thread:${params.serverId}:${params.userId}`, thread, 60000);
    return thread;
  });

  // Non-streaming chat endpoint
  fastify.post('/api/threads/:threadId/chat', async (request, reply) => {
    const params = z.object({ threadId: z.string() }).parse(request.params);
    const body = z.object({ message: z.string().min(1).max(10000), userId: z.string().optional() }).parse(request.body);
    const userId = body.userId || 'anonymous';
    let thread = await prisma.chatThread.findUnique({ where: { id: params.threadId }, include: { server: true, messages: { orderBy: { createdAt: 'asc' }, take: 50 } } });
    if (!thread) {
      const serverId = params.threadId.replace(/^thread_/, '');
      const server = await prisma.server.findUnique({ where: { id: serverId } });
      if (!server) return reply.status(404).send({ error: 'Server not found' });
      thread = await prisma.chatThread.create({ data: { id: params.threadId, serverId, userId, title: 'New Chat', status: 'open' }, include: { server: true } });
    }
    const gateway = (fastify as any).agentGateway;
    if (!gateway) return reply.status(500).send({ error: 'Agent gateway not initialized' });
    const chunks: string[] = [];
    let lastError: string | undefined;
    await handleChatMessage(gateway, thread.serverId, params.threadId, userId, body.message, (chunk) => {
      if (chunk.type === 'text') chunks.push(chunk.content);
      if (chunk.type === 'error') lastError = chunk.content;
    });
    cache.invalidate(`threads:${thread.serverId}:${userId}`);
    cache.invalidate(`thread:${thread.serverId}:${userId}`);
    if (!chunks.length) {
      if (lastError) return reply.send({ threadId: params.threadId, response: lastError });
      const agentConnected = gateway.isConnected(thread.serverId);
      if (!agentConnected) return reply.send({ threadId: params.threadId, response: 'The AI has no response because no agent is connected to this server. Pair your FiveM server first to enable file operations and full AI assistance.' });
      return reply.send({ threadId: params.threadId, response: 'The AI did not return a response. Please try again.' });
    }
    return { threadId: params.threadId, response: chunks.join('') };
  });

  // ============================================
  // Players
  // ============================================

  fastify.get('/api/servers/:serverId/players', async (request, reply) => {
    const params = z.object({ serverId: z.string() }).parse(request.params);
    const cached = cache.get(`players:${params.serverId}`);
    if (cached) return cached;
    const agentGateway = (fastify as any).agentGateway;
    if (!agentGateway || !agentGateway.isConnected(params.serverId)) {
      return reply.status(400).send({ error: 'Agent not connected' });
    }
    try {
      const players = await agentGateway.sendCommand(params.serverId, 'fivem.listPlayers', {}, 10000);
      cache.set(`players:${params.serverId}`, players, 15000);
      return players;
    } catch (e) {
      return reply.status(500).send({ error: e instanceof Error ? e.message : 'Failed to fetch players' });
    }
  });

  // ============================================
  // Settings
  // ============================================

  fastify.get('/api/servers/:serverId/settings', async (request, reply) => {
    const params = z.object({ serverId: z.string() }).parse(request.params);
    const server = await prisma.server.findUnique({ where: { id: params.serverId }, select: { settings: true, rootLabel: true } });
    return { settings: server?.settings || {}, serverDir: server?.rootLabel || '' };
  });

  fastify.put('/api/servers/:serverId/settings', async (request, reply) => {
    const params = z.object({ serverId: z.string() }).parse(request.params);
    const body = z.object({ settings: z.record(z.unknown()).optional(), serverDir: z.string().optional() }).parse(request.body);
    const updates: any = {};
    if (body.settings !== undefined) updates.settings = body.settings;
    if (body.serverDir !== undefined) updates.rootLabel = body.serverDir;
    const server = await prisma.server.update({ where: { id: params.serverId }, data: updates, select: { settings: true, rootLabel: true } });
    return { settings: server.settings, serverDir: server.rootLabel };
  });

  // ============================================
  // Changes
  // ============================================

  // Get pending changes for a server
  fastify.get('/api/servers/:serverId/changes', async (request, reply) => {
    const params = z.object({
      serverId: z.string(),
    }).parse(request.params);

    const changes = await prisma.change.findMany({
      where: { serverId: params.serverId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return changes;
  });

  // Get a specific change
  fastify.get('/api/changes/:changeId', async (request, reply) => {
    const params = z.object({
      changeId: z.string(),
    }).parse(request.params);

    const change = await prisma.change.findUnique({
      where: { id: params.changeId },
    });

    if (!change) {
      return reply.status(404).send({ error: 'Change not found' });
    }

    return change;
  });

  // Apply a change (triggers agent action)
  fastify.post('/api/changes/:changeId/apply', async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({
      changeId: z.string(),
    }).parse(request.params);

    const change = await prisma.change.findFirst({
      where: { id: params.changeId, server: { orgId: user.orgId } },
      include: { server: true },
    });

    if (!change) {
      return reply.status(404).send({ error: 'Change not found' });
    }

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
    const files = parseDiffToPatch(changeWithFiles.diff, touchedFiles);
    
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
      return reply.status(500).send({ error: `Failed to apply change: ${error.message}` });
    }
  });

  // ============================================
  // Resources (Index)
  // ============================================

  // Get resources for a server
  fastify.get('/api/servers/:serverId/resources', async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({
      serverId: z.string(),
    }).parse(request.params);

    // Verify server belongs to user's org
    const server = await prisma.server.findFirst({
      where: { id: params.serverId, orgId: user.orgId },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

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

    const server = await prisma.server.findFirst({
      where: { id: params.serverId, orgId: user.orgId },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

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
    const params = z.object({ serverId: z.string() }).parse(request.params);
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

  // Restart a server (sends command to agent)
  fastify.post('/api/servers/:serverId/restart', async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({
      serverId: z.string(),
    }).parse(request.params);

    const server = await prisma.server.findFirst({
      where: { id: params.serverId, orgId: user.orgId },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

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
        {},
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

  // Claim pairing code (called by agent)
  fastify.post('/api/pairing/claim', async (request, reply) => {
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

    await prisma.agentDevice.update({
      where: { id: device.id },
      data: {
        status: 'paired',
        agentVersion: body.agentVersion,
        platform: body.platform,
        lastHeartbeatAt: new Date(),
        pairingCode: null,
        pairingExpiresAt: null,
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
      wsUrl: process.env.ORCHESTRATOR_WS_URL || 'ws://localhost:3001/ws/agent',
    };
  });

  // Refresh pairing code for an unpaired server
  fastify.post('/api/servers/:serverId/pairing', async (request, reply) => {
    const user = request.authUser;
    const orgId = user?.orgId || 'dev-org';
    const params = z.object({ serverId: z.string() }).parse(request.params);

    const server = await prisma.server.findFirst({
      where: { id: params.serverId, orgId },
      include: {
        agentDevices: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    if (server.agentDevices.some((d: any) => d.status === 'paired')) {
      return reply.status(400).send({ error: 'Server is already paired' });
    }

    const pending = server.agentDevices.find((d: any) => d.status === 'pending');
    const pairing = await issuePairing(server.id, pending?.id);
    return { pairing };
  });

  // Revoke agent
  fastify.post('/api/servers/:serverId/revoke', async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({ serverId: z.string() }).parse(request.params);

    // Verify server belongs to user's org
    const server = await prisma.server.findFirst({
      where: { id: params.serverId, orgId: user.orgId },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    await prisma.agentDevice.updateMany({
      where: { serverId: params.serverId, status: 'paired' },
      data: { status: 'revoked' },
    });

    await prisma.server.update({
      where: { id: params.serverId },
      data: { status: 'offline' },
    });

    return { success: true };
  });

  // ============================================
  // Players
  // ============================================

  fastify.get('/api/servers/:serverId/players', async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({ serverId: z.string() }).parse(request.params);

    const server = await prisma.server.findFirst({
      where: { id: params.serverId, orgId: user.orgId },
    });
    if (!server) return reply.status(404).send({ error: 'Server not found' });

    const players = await prisma.player.findMany({
      where: { serverId: params.serverId },
      orderBy: { name: 'asc' },
    });

    return players;
  });

  fastify.post('/api/servers/:serverId/players/:playerId/ban', async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({
      serverId: z.string(),
      playerId: z.string(),
    }).parse(request.params);
    const body = z.object({ reason: z.string().optional() }).parse(request.body);

    const server = await prisma.server.findFirst({
      where: { id: params.serverId, orgId: user.orgId },
    });
    if (!server) return reply.status(404).send({ error: 'Server not found' });

    const player = await prisma.player.findFirst({
      where: { id: params.playerId, serverId: params.serverId },
    });
    if (!player) return reply.status(404).send({ error: 'Player not found' });

    const now = new Date();
    const updated = await prisma.player.update({
      where: { id: params.playerId },
      data: { isBanned: true, banReason: body.reason || 'Banned via NOX', bannedAt: now },
    });

    const gateway = (fastify as any).agentGateway as AgentGateway;
    if (gateway.isConnected(params.serverId)) {
      gateway.sendCommand(params.serverId, 'fivem.banPlayer', {
        playerId: player.playerId,
        reason: body.reason || 'Banned via NOX',
      }, 10000).catch(() => {});
    }

    return { ...updated, bannedAt: now.toISOString() };
  });

  fastify.post('/api/servers/:serverId/players/:playerId/unban', async (request, reply) => {
    const user = requireAuth(request, reply);
    const params = z.object({
      serverId: z.string(),
      playerId: z.string(),
    }).parse(request.params);

    const server = await prisma.server.findFirst({
      where: { id: params.serverId, orgId: user.orgId },
    });
    if (!server) return reply.status(404).send({ error: 'Server not found' });

    const updated = await prisma.player.update({
      where: { id: params.playerId },
      data: { isBanned: false, banReason: null, bannedAt: null },
    });

    const gateway = (fastify as any).agentGateway as AgentGateway;
    if (gateway.isConnected(params.serverId)) {
      gateway.sendCommand(params.serverId, 'fivem.unbanPlayer', {
        playerId: updated.playerId,
      }, 10000).catch(() => {});
    }

    return updated;
  });

  // ============================================
  // Global Changes (all servers)
  // ============================================

  fastify.get('/api/changes', async (request, reply) => {
    // In development, use default org if not authenticated
    const user = request.authUser;
    const orgId = user ? user.orgId : 'dev-org';
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
  // Billing / Org
  // ============================================

  fastify.get('/api/org', async (request, reply) => {
    const user = requireAuth(request, reply);
    const org = await prisma.organization.findUnique({
      where: { id: user.orgId },
    });
    if (!org) return reply.status(404).send({ error: 'Organization not found' });

    const actionCount = await prisma.change.count({
      where: { server: { orgId: user.orgId }, createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
    });

    return {
      id: org.id,
      name: org.name,
      planTier: org.plan_tier,
      monthlyActionLimit: org.monthly_action_limit,
      monthlyActionCount: actionCount,
      monthlyCostCap: org.monthly_cost_cap_usd?.toNumber() ?? 20,
      createdAt: org.created_at,
    };
  });
  // ============================================
  // Pairing helpers
  // ============================================

  async function issuePairing(serverId: string, agentDeviceId?: string) {
    const code = generatePairingCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (agentDeviceId) {
      await prisma.agentDevice.update({
        where: { id: agentDeviceId },
        data: {
          status: 'pending',
          pairingCode: code,
          pairingExpiresAt: expiresAt,
          pairingTokenHash: null,
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
