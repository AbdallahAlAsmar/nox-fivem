import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

export interface AuthUser {
  userId: string;
  orgId: string;
  email: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

let jwksClientInstance: JwksClient | null = null;

function getJwksClient(): JwksClient {
  if (!jwksClientInstance) {
    const clerkJwksUrl = `https://${process.env.CLERK_JWKS_DOMAIN || 'clerk.example.com'}/.well-known/jwks.json`;
    jwksClientInstance = new JwksClient({
      jwksUri: process.env.CLERK_JWKS_URL || clerkJwksUrl,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }
  return jwksClientInstance;
}

async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const client = getJwksClient();
    const tokenPayload = token.split('.')[1];
    if (!tokenPayload) return null;

    const decoded = JSON.parse(Buffer.from(tokenPayload, 'base64').toString()) as JwtPayload & {
      kid?: string;
      sid?: string;
      org_id?: string;
      org_role?: string;
    };

    if (!decoded.sub || !decoded.org_id || !decoded.kid) {
      return null;
    }

    const key = await client.getSigningKey(decoded.kid);
    const signingKey = key.getPublicKey();

    const verified = jwt.verify(token, signingKey, {
      algorithms: ['RS256'],
      audience: process.env.CLERK_JWT_AUDIENCE || undefined,
    }) as JwtPayload & { sid: string; org_id: string; org_role: string; email?: string };

    if (!verified.sub || !verified.org_id) return null;

    return {
      userId: verified.sub as string,
      orgId: verified.org_id,
      email: verified.email || '',
      role: verified.org_role || 'developer',
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('authUser', null);

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const publicPaths = ['/health', '/api/pairing/claim', '/api/servers', '/api/threads/', '/api/changes', '/api/onboarding', '/api/usage', '/api/org'];
    if (publicPaths.some(p => request.url.startsWith(p))) {
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.slice(7);
    const user = await verifyToken(token);

    if (!user) {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }

    request.authUser = user;
  });
}

export function requireAuth(request: FastifyRequest, _reply: FastifyReply): AuthUser {
  if (!request.authUser) {
    throw new Error('Authentication required');
  }
  return request.authUser;
}
