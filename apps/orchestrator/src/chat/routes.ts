import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '@fivem-ai/db';
import { handleChatMessage } from '../chat/chatService';
import { cache } from '../cache/cache';

export async function registerChatRoutes(fastify: FastifyInstance) {
  // Get chat threads for a server (with history)
  fastify.get('/api/servers/:serverId/threads', async (request, reply) => {
    const params = z.object({ serverId: z.string() }).parse(request.params);
    const userId = (request as any).userId || 'anonymous';
    
    const cached = cache.get(`threads:${params.serverId}:${userId}`);
    if (cached) return cached;

    const threads = await prisma.chatThread.findMany({
      where: { serverId: params.serverId, userId },
      include: { 
        messages: { 
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        server: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const result = threads.map(t => ({
      id: t.id,
      title: t.title || `Chat - ${t.messages[0]?.content?.substring(0, 30) || 'New'}...`,
      lastMessage: t.messages[0]?.content || '',
      lastMessageAt: t.updatedAt,
      messageCount: t.messages.length,
    }));

    cache.set(`threads:${params.serverId}:${userId}`, result, 30000);
    return result;
  });

  // Get or create a thread for a server and user
  fastify.get('/api/servers/:serverId/threads/:userId', async (request, reply) => {
    const params = z.object({ 
      serverId: z.string(),
      userId: z.string()
    }).parse(request.params);
    
    const cached = cache.get(`thread:${params.serverId}:${params.userId}`);
    if (cached) return cached;

    let thread = await prisma.chatThread.findFirst({
      where: { 
        serverId: params.serverId, 
        userId: params.userId 
      },
      include: { 
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!thread) {
      thread = await prisma.chatThread.create({
        data: {
          serverId: params.serverId,
          userId: params.userId,
          title: 'General Chat',
          status: 'open',
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    }

    cache.set(`thread:${params.serverId}:${params.userId}`, thread, 60000);
    return thread;
  });

  // Non-streaming chat endpoint
  fastify.post('/api/threads/:threadId/chat', async (request, reply) => {
    const params = z.object({ threadId: z.string() }).parse(request.params);
    const body = z.object({ message: z.string().min(1).max(10000), userId: z.string().optional() }).parse(request.body);
    const userId = body.userId || 'anonymous';

    let thread = await prisma.chatThread.findUnique({ 
      where: { id: params.threadId }, 
      include: { server: true, messages: { orderBy: { createdAt: 'asc' }, take: 50 } } 
    });

    if (!thread) {
      const serverId = params.threadId.replace(/^thread_/, '');
      const server = await prisma.server.findUnique({ where: { id: serverId } });
      if (!server) return reply.status(404).send({ error: 'Server not found' });

      thread = await prisma.chatThread.create({
        data: {
          id: params.threadId,
          serverId,
          userId,
          title: 'New Chat',
          status: 'open',
        },
        include: { server: true },
      });
    }

    const gateway = (fastify as any).agentGateway;
    if (!gateway) return reply.status(500).send({ error: 'Agent gateway not initialized' });

    const chunks: string[] = [];
    let lastError: string | undefined;
    await handleChatMessage(gateway, thread.serverId, params.threadId, userId, body.message, (chunk) => {
      if (chunk.type === 'text') chunks.push(chunk.content);
      if (chunk.type === 'error') lastError = chunk.content;
    });

    // Invalidate cache
    cache.invalidate(`threads:${thread.serverId}:${userId}`);
    cache.invalidate(`thread:${thread.serverId}:${userId}`);

    if (!chunks.length) {
      if (lastError) {
        return reply.send({ threadId: params.threadId, response: lastError });
      }
      const agentConnected = gateway.isConnected(thread.serverId);
      if (!agentConnected) {
        return reply.send({
          threadId: params.threadId,
          response: 'The AI has no response because no agent is connected to this server. Pair your FiveM server first to enable file operations and full AI assistance.',
        });
      }
      return reply.send({
        threadId: params.threadId,
        response: 'The AI did not return a response. Please try again.',
      });
    }

    return { threadId: params.threadId, response: chunks.join('') };
  });

  // Get server players
  fastify.get('/api/servers/:serverId/players', async (request, reply) => {
    const params = z.object({ serverId: z.string() }).parse(request.params);
    
    const cached = cache.get(`players:${params.serverId}`);
    if (cached) return cached;

    const players = await prisma.player.findMany({
      where: { serverId: params.serverId },
      orderBy: { name: 'asc' },
    });

    cache.set(`players:${params.serverId}`, players, 15000);
    return players;
  });

  // Get server settings
  fastify.get('/api/servers/:serverId/settings', async (request, reply) => {
    const params = z.object({ serverId: z.string() }).parse(request.params);
    
    const server = await prisma.server.findUnique({
      where: { id: params.serverId },
      select: { settings: true },
    });

    return server?.settings || {};
  });

  // Update server settings
  fastify.put('/api/servers/:serverId/settings', async (request, reply) => {
    const params = z.object({ serverId: z.string() }).parse(request.params);
    const body = z.object({ settings: z.record(z.any()).optional() }).parse(request.body);
    
    const server = await prisma.server.update({
      where: { id: params.serverId },
      data: { settings: { ...(body.settings || {}) } },
    });

    // Invalidate cache
    cache.invalidate(`server:${params.serverId}`);
    cache.invalidate(`players:${params.serverId}`);

    return server.settings;
  });
}
