import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken as clerkVerifyToken } from '@clerk/backend';
import fp from 'fastify-plugin';
import { resolveUser } from './provisioning';

export interface AuthUser {
  /** Stable Clerk user id from the verified token's `sub` claim. */
  userId: string;
  /** Tenant organization id — always resolved from provisioning, NEVER from JWT claims. */
  orgId: string;
  email: string;
  role: string;
  /** Internal AppUser row id (may be '' during transitional anonymous mode). */
  appId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser | null;
  }
}

/**
 * Transitional legacy identity used while AUTH_ALLOW_ANON=true and a request
 * arrives with NO Authorization header at all. Requests carrying an invalid or
 * expired token are ALWAYS rejected regardless of this flag.
 */
const ANONYMOUS_USER: AuthUser = {
  userId: 'anonymous',
  orgId: 'dev-org',
  email: '',
  role: 'anonymous',
  appId: '',
};

/**
 * Public routes, exact-match on `${method} ${pathname}`. Anything not listed
 * here requires authentication (deny by default).
 */
const PUBLIC_ROUTES = new Set([
  'GET /health',
  'POST /api/pairing/claim',
  // WS upgrade endpoints: agent handshake authenticates at agent.hello,
  // browser status socket is read-only broadcast.
  'GET /ws/agent',
  'GET /ws/status',
  // Public resource catalog browsing.
  'GET /api/resources/catalog',
]);

// GET /api/resources/catalog/:slug
const CATALOG_SLUG_PATTERN = /^\/api\/resources\/catalog\/[^/]+$/;

function isPublicPath(method: string, pathname: string): boolean {
  if (PUBLIC_ROUTES.has(`${method} ${pathname}`)) return true;
  if (method === 'GET' && CATALOG_SLUG_PATTERN.test(pathname)) return true;
  return false;
}

/**
 * Transitional flag: defaults to TRUE so existing deploys keep working.
 * Flipping it to false is an ops action, not a code change.
 */
function authAllowAnon(): boolean {
  const raw = process.env.AUTH_ALLOW_ANON;
  if (raw === undefined || raw === '') return true;
  return raw === 'true' || raw === '1';
}

async function verifyClerkToken(token: string): Promise<AuthUser | null> {
  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      console.error('[auth] CLERK_SECRET_KEY is not configured — cannot verify tokens');
      return null;
    }
    const payload = await clerkVerifyToken(token, { secretKey });
    if (!payload || !payload.sub) return null;

    // Defensive claim mapping: template/email claims may be absent.
    const claims = payload as unknown as Record<string, unknown>;
    const email = typeof claims.email === 'string' ? claims.email : null;
    // NOTE: orgId is deliberately NOT read from JWT org_* claims — tenancy is
    // owned by the AppUser provisioning record.
    return await resolveUser(payload.sub, email);
  } catch (error) {
    console.error(
      '[auth] Clerk token verification failed:',
      (error as Error)?.message || error,
    );
    return null;
  }
}

async function authHook(request: FastifyRequest, reply: FastifyReply) {
  let pathname = request.url.split('?')[0] || '/';
  try {
    pathname = new URL(request.url, 'http://internal').pathname;
  } catch {
    // fall back to the naive split above
  }
  if (isPublicPath(request.method.toUpperCase(), pathname)) {
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader) {
    // Transitional: unauthenticated calls continue to work under the shared
    // dev-org identity until ops flips AUTH_ALLOW_ANON=false.
    if (authAllowAnon()) {
      request.authUser = ANONYMOUS_USER;
      return;
    }
    return reply.status(401).send({ error: 'Missing Authorization header' });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Invalid Authorization header format' });
  }

  const user = await verifyClerkToken(authHeader.slice(7).trim());
  if (!user) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }

  request.authUser = user;
}

const authPluginImpl = async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('authUser', null);
  fastify.addHook('preHandler', authHook);
};

// fastify-plugin breaks encapsulation so the hook applies to every route
// registered anywhere in the orchestrator, regardless of registration order.
export const authPlugin = fp(authPluginImpl, { name: 'auth' });
export default authPlugin;

export function requireAuth(request: FastifyRequest, _reply?: FastifyReply): AuthUser {
  const user = request.authUser;
  if (!user) {
    const err = new Error('Authentication required') as Error & { statusCode?: number };
    err.statusCode = 401;
    throw err;
  }
  return user;
}

export { resolveUser, clearUserCache } from './provisioning';
