import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

// ---------------------------------------------------------------------------
// Mocks BEFORE imports — mirrors ws-status.test.ts patterns. We mock the DB
// layer and Clerk token verification, then boot a REAL Fastify instance with
// the REAL authPlugin + registerRoutes so the tests exercise actual routing,
// auth hook ordering, and handler logic via fastify.inject().
// ---------------------------------------------------------------------------

const mockVerifyToken = vi.fn();

vi.mock('@clerk/backend', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

const serverFindFirst = vi.fn();
const serverFindUnique = vi.fn();
const serverUpdate = vi.fn();
const auditLogCreate = vi.fn();
const agentDeviceFindMany = vi.fn();
const agentDeviceUpdate = vi.fn();
const agentDeviceCreate = vi.fn();
const appUserFindUnique = vi.fn();

vi.mock('@fivem-ai/db', () => {
  const prisma = {
    $queryRaw: vi.fn(),
    // resolveUser()'s cache-miss path runs provisioning inside a transaction.
    $transaction: vi.fn().mockResolvedValue(null),
    server: {
      findUnique: serverFindUnique,
      findFirst: serverFindFirst,
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: serverUpdate,
      delete: vi.fn(),
    },
    agentDevice: {
      findFirst: vi.fn(),
      create: agentDeviceCreate,
      update: agentDeviceUpdate,
      updateMany: vi.fn(),
    },
    chatThread: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    chatMessage: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), deleteMany: vi.fn() },
    change: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn(), update: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    resourceIndex: { findMany: vi.fn().mockResolvedValue([]), upsert: vi.fn() },
    player: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
    usageLog: { findMany: vi.fn() },
    auditLog: { create: auditLogCreate, findMany: vi.fn().mockResolvedValue([]) },
    organization: { findUnique: vi.fn(), update: vi.fn() },
    appUser: {
      findUnique: appUserFindUnique,
      create: vi.fn(),
    },
  };
  return { prisma, default: prisma };
});

vi.mock('../src/chat/chatService', () => ({
  handleChatMessage: vi.fn(),
}));
vi.mock('../src/cache/cache', () => ({
  cache: { get: vi.fn(), set: vi.fn(), invalidate: vi.fn() },
}));

const AUTH_USER = {
  userId: 'user_abc',
  orgId: 'org-123',
  email: 'dev@example.com',
  role: 'owner',
  appId: 'appuser-1',
};

let app: FastifyInstance;

beforeAll(async () => {
  // The verifier refuses to run without a configured secret; tests only need
  // it present, never valid — @clerk/backend is fully mocked.
  process.env.CLERK_SECRET_KEY = 'sk_test_nothing-real';

  // Import AFTER mocks are registered.
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
  mockVerifyToken.mockResolvedValue({
    sub: 'user_abc',
    email: 'dev@example.com',
  });
  // resolveUser() looks up provisioning through this — cleared above, so
  // re-arm it every test.
  appUserFindUnique.mockResolvedValue({
    id: 'appuser-1',
    clerkUserId: 'user_abc',
    organizationId: 'org-123',
    email: 'dev@example.com',
  });
  serverFindFirst.mockResolvedValue(null);
  serverFindUnique.mockResolvedValue(null);
  serverUpdate.mockResolvedValue({});
  auditLogCreate.mockResolvedValue({});
});

async function get(path: string) {
  return app.inject({ method: 'GET', url: path, headers: { authorization: 'Bearer good' } });
}

describe('PATCH /api/servers/:serverId (rename)', () => {
  it('renames an owned server and returns it', async () => {
    serverFindFirst
      .mockResolvedValueOnce({ id: 'srv1', orgId: 'org-123', name: 'Old Name' }) // assertServerAccess
      .mockResolvedValue({ id: 'srv1', orgId: 'org-123', name: 'Old Name' });
    serverUpdate.mockResolvedValue({ id: 'srv1', name: 'New Name' });

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/servers/srv1',
      headers: { authorization: 'Bearer good' },
      payload: { name: 'New Name' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: 'srv1', name: 'New Name' });
    expect(serverUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: 'New Name' } }),
    );
  });

  it('404s when the server belongs to another org (no existence leak)', async () => {
    serverFindFirst.mockResolvedValue(null);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/servers/srv-other-org',
      headers: { authorization: 'Bearer good' },
      payload: { name: 'X' },
    });

    expect(res.statusCode).toBe(404);
    expect(serverUpdate).not.toHaveBeenCalled();
  });

  it('rejects empty and oversized names', async () => {
    for (const bad of ['', '   ', 'x'.repeat(101)]) {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/servers/srv1',
        headers: { authorization: 'Bearer good' },
        payload: { name: bad },
      });
      expect(res.statusCode).toBe(400);
    }
    expect(serverUpdate).not.toHaveBeenCalled();
  });

  it('requires authentication — an invalid bearer token is rejected even in transitional anon mode', async () => {
    mockVerifyToken.mockResolvedValue(null); // token fails Clerk verification
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/servers/srv1',
      headers: { authorization: 'Bearer bogus' },
      payload: { name: 'N' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/servers/:serverId/regenerate-pairing (alias)', () => {
  const pendingDevice = { id: 'dev1', status: 'pending', pairingCode: null };

  function mockUnpairedServer() {
    serverFindFirst.mockResolvedValue({
      id: 'srv1',
      orgId: 'org-123',
      name: 'My Server',
      agentDevices: [pendingDevice],
    });
    serverFindUnique.mockResolvedValue({
      id: 'srv1',
      orgId: 'org-123',
      name: 'My Server',
      agentDevices: [pendingDevice],
    });
    agentDeviceUpdate.mockResolvedValue({});
    agentDeviceCreate.mockResolvedValue({ id: 'dev2' });
  }

  it('returns flat { code, expiresAt } like the dashboard expects', async () => {
    mockUnpairedServer();

    const res = await app.inject({
      method: 'POST',
      url: '/api/servers/srv1/regenerate-pairing',
      headers: { authorization: 'Bearer good' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(typeof body.expiresAt).toBe('string');
    expect(body.pairing).toBeUndefined(); // flat, not wrapped
  });

  it('keeps the legacy /pairing shape ({ pairing }) untouched', async () => {
    mockUnpairedServer();

    const res = await app.inject({
      method: 'POST',
      url: '/api/servers/srv1/pairing',
      headers: { authorization: 'Bearer good' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.pairing?.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it('400s when the server is already paired (both paths)', async () => {
    const pairedServer = {
      id: 'srv1',
      orgId: 'org-123',
      name: 'My Server',
      agentDevices: [{ id: 'dev1', status: 'paired', pairingCode: null }],
    };
    serverFindFirst.mockResolvedValue(pairedServer);
    serverFindUnique.mockResolvedValue(pairedServer);

    for (const path of ['/api/servers/srv1/pairing', '/api/servers/srv1/regenerate-pairing']) {
      const res = await app.inject({
        method: 'POST',
        url: path,
        headers: { authorization: 'Bearer good' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('Server is already paired');
    }
  });

  it('404s cross-org on both paths', async () => {
    serverFindFirst.mockResolvedValue(null);
    serverFindUnique.mockResolvedValue(null);
    for (const path of ['/api/servers/srv-x/pairing', '/api/servers/srv-x/regenerate-pairing']) {
      const res = await app.inject({
        method: 'POST',
        url: path,
        headers: { authorization: 'Bearer good' },
      });
      expect(res.statusCode).toBe(404);
    }
  });
});
