import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '@fivem-ai/db';
import { handleChatMessage } from '../chat/chatService';

export async function registerChatRoutes(fastify: FastifyInstance) {
  // Non-streaming chat endpoint
  fastify.post('/api/threads/:threadId/chat', async (request, reply) => {
    const params = z.object({ threadId: z.string() }).parse(request.params);
    const body = z.object({ message: z.string().min(1).max(10000), userId: z.string().optional() }).parse(request.body);
    const userId = body.userId || 'anonymous';

    let thread = await prisma.chatThread.findUnique({ where: { id: params.threadId }, include: { server: true } });

    // Auto-create thread if it doesn't exist (e.g. client-fabricated thread IDs)
    if (!thread) {
      const serverId = params.threadId.replace(/^thread_/, '');
      const server = await prisma.server.findUnique({ where: { id: serverId } });
      if (!server) return reply.status(404).send({ error: 'Server not found' });

      thread = await prisma.chatThread.create({
        data: {
          id: params.threadId,
          serverId,
          userId,
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

    if (!chunks.length) {
      if (lastError) {
        console.log('[chat] AI returned no text, error:', lastError);
        return reply.send({ threadId: params.threadId, response: lastError });
      }
      // No text and no error — agent was likely disconnected, give a helpful message
      const agentConnected = gateway.isConnected(thread.serverId);
      if (!agentConnected) {
        return reply.send({
          threadId: params.threadId,
          response: 'The AI has no response because no agent is connected to this server. Pair your FiveM server first to enable file operations and full AI assistance. You can still ask general FiveM questions.',
        });
      }
      return reply.send({
        threadId: params.threadId,
        response: 'The AI did not return a response. Please try again.',
      });
    }

    return { threadId: params.threadId, response: chunks.join('') };
  });
}
