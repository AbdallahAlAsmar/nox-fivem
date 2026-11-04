import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

// ---------------------------------------------------------------------------
// Rate-limit behavior tests: global IP limit, per-user chat throttle, and the
// machine-readable 429 body. Same mock/boot pattern as http-routes.test.ts —
// real Fastify + real authPlugin + registerRoutes exercised via inject().
// ---------------------------------------------------------------------------

const mockVerifyToken = vi.fn();

vi.mock('@clerk/backend', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

const appUserFindUnique = vi.fn();

vi.mock('@fivem-ai/db', () => {
  const prisma = {
    $queryRaw: vi.fn(),
    $transaction: vi.fn().mockResolvedValue(null),
    server: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    agentDevice: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    chatThread: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    chatMessage: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), deleteMany: vi.fn() },
    change: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn(), update: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    resourceIndex: { findMany: vi.fn().mockResolvedValue([]), upsert: vi.fn() },
    player: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
    usageLog: { findMany: vi.fn() },
    auditLog: { create: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    organization: { findUnique: vi.fn(), update: vi.fn() },
    appUser: { findUnique: (...a: unknown[]) => appUserFindUnique(...a), create: vi.fn() },
  };
  return { prisma, default: prisma };
});

const AUTH_USER = {
  userId: 'user_abc',
  orgId: 'org-123',
  email: 'dev@example.com',
  role: 'owner',
  appId: 'appuser-1',
};

let app: FastifyInstance;

beforeAll(async () => {
  process.env.CLERK_SECRET_KEY = 'sk_test_nothing-real';

  const { authPlugin } = await import('./src/auth');
  const { registerRoutes } = await import('./src/http/routes');

  app = Fastify({ logger: false });
  app.decorate('agentGateway', {
    isConnected: vi.fn().mockReturnValue(false),
    sendCommand: vi.fn(),
    forceDisconnect: vi.fn(),
  });
  await app.register(authPlugin);
  await registerRoutes(app);
  await app.ready();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyToken.mockResolvedValue({ sub: 'user_abc', email: 'dev@example.com' });
  appUserFindUnique.mockImplementation((_args: any) =>
    Promise.resolve({
      id: 'appuser-1',
      clerkUserId: 'user_abc',
      organizationId: 'org-123',
      email: 'dev@example.com',
    }),
  );
});

describe('rate limiting', () => {
  it('429s with { error: "rate_limited" } after the pairing/claim per-IP limit (5/min)', async () => {
    // Pairing claim is unauthenticated and hits prisma before any rate limit;
    // a 404 still counts as a request against the bucket.
    for (let i = 0; i < 5; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/pairing/claim',
        payload: { pairingCode: 'ABCD-1234' },
      });
      expect([400, 404]).toContain(res.statusCode); // zod-invalid body → 400
    }

    const res = await app.inject({
      method: 'POST',
      url: '/api/pairing/claim',
      payload: { pairingCode: 'ABCD-1234' },
    });
    expect(res.statusCode).toBe(429);
    expect(res.json().error).toBe('rate_limited');
  });

  it('throttles chat per user at 20/min while other routes keep their own buckets', async () => {
    // Drive the chat bucket to exhaustion with cheap requests (404 after auth,
    // but each one counts against the route's per-user bucket).
    for (let i = 0; i < 20; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/threads/thread_x/chat',
        headers: { authorization: 'Bearer good' },
        payload: { message: 'hi' },
      });
      expect(res.statusCode).toBe(404); // thread not found — cheap, no LLM call
    }
    const blocked = await app.inject({
      method: 'POST',
      url: '/api/threads/thread_x/chat',
      headers: { authorization: 'Bearer good' },
      payload: { message: 'hi' },
    });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().error).toBe('rate_limited');

    // A different route is NOT affected by the chat bucket.
    const other = await app.inject({
      method: 'GET',
      url: '/api/servers',
      headers: { authorization: 'Bearer good' },
    });
    expect(other.statusCode).not.toBe(429);
  });

  it('keys the chat bucket per user — user 2 is unaffected by user 1 exhaustion', async () => {
    // Exhaust as a second user.
    mockVerifyToken.mockResolvedValue({ sub: 'user_other', email: 'o@x.com' });
    for (let i = 0; i < 20; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/threads/thread_y/chat',
        headers: { authorization: 'Bearer good2' },
        payload: { message: 'hi' },
      });
    }
    const blockedOther = await app.inject({
      method: 'POST',
      url: '/api/threads/thread_y/chat',
      headers: { authorization: 'Bearer good2' },
      payload: { message: 'hi' },
    });
    expect(blockedOther.json()).toMatchObject({ error: 'rate_limited' });

    // First user (exhausted in previous test? No — different bucket key) … use
    // provisioning to switch identity back. resolveUser caches by clerkUserId,
    // so re-arm the mocks for user_abc.
    mockVerifyToken.mockResolvedValue({ sub: 'someone_else', email: 'z@x.com' });
    // Fresh clerkUserId → fresh provisioning lookup → different userId bucket.
    const res = await app.inject({
      method: 'POST',
      url: '/api/threads/thread_z/chat',
      headers: { authorization: 'Bearer good3' },
      payload: { message: 'hi' },
    });
    // The global 300/min IP bucket is shared, so this specific request may be
    // throttled only if THAT bucket is exhausted; per-user chat exhaustion of
    // another user must not cause it.
    expect(res.statusCode).toBe(404);
  });
});
