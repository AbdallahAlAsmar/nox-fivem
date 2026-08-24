import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@fivem-ai/db';
import type { Server, ChatThread, Change, ResourceInstall } from '@prisma/client';
import { requireAuth } from './index';

function notFound(reply: FastifyReply): null {
  reply.status(404).send({ error: 'Not found' });
  return null;
}

/**
 * Fetch a server row scoped to the caller's org. Replies 404 and returns null
 * when the server does not exist OR belongs to another org (no existence leak).
 *
 * Caller pattern:
 *   const server = await assertServerAccess(request, reply, id);
 *   if (!server) return;
 */
export async function assertServerAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  serverId: string,
): Promise<Server | null> {
  const user = requireAuth(request);
  return prisma.server.findFirst({
    where: { id: serverId, orgId: user.orgId },
  }).then((server) => (server ? server : notFound(reply)));
}

/** Fetch a chat thread whose parent server is scoped to the caller's org. */
export async function assertThreadAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  threadId: string,
): Promise<ChatThread | null> {
  const user = requireAuth(request);
  return prisma.chatThread.findFirst({
    where: { id: threadId, server: { orgId: user.orgId } },
  }).then((thread) => (thread ? thread : notFound(reply)));
}

/** Fetch a change whose parent server is scoped to the caller's org. */
export async function assertChangeAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  changeId: string,
): Promise<Change | null> {
  const user = requireAuth(request);
  return prisma.change.findFirst({
    where: { id: changeId, server: { orgId: user.orgId } },
  }).then((change) => (change ? change : notFound(reply)));
}

/** Fetch a resource install whose parent server is scoped to the caller's org. */
export async function assertInstallAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  installId: string,
): Promise<ResourceInstall | null> {
  const user = requireAuth(request);
  return prisma.resourceInstall.findFirst({
    where: { id: installId, server: { orgId: user.orgId } },
  }).then((install) => (install ? install : notFound(reply)));
}

/**
 * Non-resource-scoped guard: returns the authenticated caller or throws a 403
 * (safe to `await` directly in handlers; Fastify converts thrown errors with
 * statusCode into responses).
 */
export async function assertOrg(request: FastifyRequest) {
  return requireAuth(request);
}
