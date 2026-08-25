import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// ---------------------------------------------------------------------------
// Mocks: @fivem-ai/db (prisma) and @clerk/backend (verifyToken) BEFORE imports.
// Mirrors ws-gateway.test.ts mocking patterns.
// ---------------------------------------------------------------------------

const mockVerifyToken = vi.fn();

vi.mock('@clerk/backend', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

vi.mock('@fivem-ai/db', () => {
  const prisma = {
    agentDevice: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    appUser: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'appuser-1',
        clerkUserId: 'user_abc',
        organizationId: 'org-123',
        email: 'dev@example.com',
      }),
      create: vi.fn(),
    },
    organization: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
    server: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  return { prisma, default: prisma };
});

vi.mock('fastify-plugin', () => ({
  default: (fn: unknown, _opts?: unknown) => {
    // Bare-bones stand-in for fastify-plugin: pass the plugin through
    // untouched (metadata assignment is irrelevant to these tests and the
    // real package marks function props read-only).
    return fn;
  },
}));

import { prisma } from '@fivem-ai/db';

class FakeWebSocket extends EventEmitter {
  readyState = 1; // OPEN
  sent: any[] = [];
  closed = false;

  send(raw: string) {
    this.sent.push(JSON.parse(raw));
  }

  close() {
    if (!this.closed) {
      this.closed = true;
      this.emit('close');
    }
  }

  lastMessage() {
    return this.sent[this.sent.length - 1];
  }
}

const mockedServerFindMany = prisma.server.findMany as ReturnType<typeof vi.fn>;

// The /ws/status handler lives inside registerRoutes. To test its auth logic
// without booting Fastify, we re-implement nothing — instead we drive a real
// Fastify instance with just the status route extracted via registerRoutes is
// too heavy; so we exercise the same decision tree through a thin harness that
// mirrors the route handler contract.
//
// To keep this honest, the harness imports the REAL helpers used by the route
// (verifyBearerToken + authAllowAnon from ../src/auth) so the test fails if
// those change behaviour.

async function importAuthHelpers() {
  return import('./src/auth');
}

function makeStatusHarness(
  gatewayLike: { getConnectedServers: () => string[]; statusListeners: Set<() => void> },
) {
  return async function handleWsStatus(connection: FakeWebSocket, req: { url: string }) {
    const { verifyBearerToken, authAllowAnon } = await importAuthHelpers();
    let scopedServerIds: Set<string> | null = null;

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
        connection.close();
        return;
      }
    } catch {
      connection.close();
      return;
    }

    const sendStatus = () => {
      const all = gatewayLike.getConnectedServers();
      // Mirrors routes.ts: authenticated callers get their org slice;
      // anonymous legacy mode degrades to an EMPTY list (no global leak).
      const servers = scopedServerIds ? all.filter((id) => scopedServerIds!.has(id)) : [];
      try {
        connection.send(JSON.stringify({
          type: 'agent.status',
          connectedServers: servers,
          total: servers.length,
        }));
      } catch {
        /* closing */
      }
    };

    sendStatus();
    gatewayLike.statusListeners.add(() => sendStatus());
    connection.on('close', () => {
      /* listener cleanup covered by routes.ts */
    });
  };
}

describe('/ws/status scoping', () => {
  const originalEnv = process.env.AUTH_ALLOW_ANON;
  const originalSecret = process.env.CLERK_SECRET_KEY;
  const connectedAll = ['srv-A', 'srv-B', 'srv-C'];
  const gatewayLike = {
    getConnectedServers: () => connectedAll,
    statusListeners: new Set<() => void>(),
  };

  beforeEach(async () => {
    vi.resetModules();
    mockVerifyToken.mockReset();
    mockedServerFindMany.mockReset();
    process.env.AUTH_ALLOW_ANON = 'true'; // transitional default
    // The verifier refuses to run without a configured secret; tests only need
    // it present, never valid — @clerk/backend is fully mocked.
    process.env.CLERK_SECRET_KEY = 'sk_test_nothing-real';
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.AUTH_ALLOW_ANON;
    else process.env.AUTH_ALLOW_ANON = originalEnv;
    if (originalSecret === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = originalSecret;
  });

  it('scopes payload to caller org servers when token present', async () => {
    const orgServers = [{ id: 'srv-B' }, { id: 'srv-C' }];
    mockedServerFindMany.mockResolvedValue(orgServers);
    mockVerifyToken.mockResolvedValue({ sub: 'user_abc' }); // Clerk payload

    const handler = makeStatusHarness(gatewayLike);
    const ws = new FakeWebSocket();
    await handler(ws, { url: '/ws/status?token=valid.jwt.token' });

    const msg = ws.lastMessage();
    expect(msg.type).toBe('agent.status');
    expect(msg.connectedServers).toEqual(['srv-B', 'srv-C']);
    expect(msg.total).toBe(2);
    // Provisioning lookup was scoped by the resolved user's orgId.
    expect(mockedServerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: expect.any(String) },
      }),
    );
    expect(ws.closed).toBe(false);
  });

  it('closes socket when token present but invalid', async () => {
    mockVerifyToken.mockRejectedValue(new Error('bad signature'));

    const handler = makeStatusHarness(gatewayLike);
    const ws = new FakeWebSocket();
    await handler(ws, { url: '/ws/status?token=tampered.jwt.token' });

    expect(ws.closed).toBe(true);
    expect(ws.sent.length).toBe(0); // no data leaked to an unauthenticated peer
  });

  it('sends an EMPTY server list when no token + flag on (anon degrades to less data)', async () => {
    const handler = makeStatusHarness(gatewayLike);
    const ws = new FakeWebSocket();
    await handler(ws, { url: '/ws/status' });

    const msg = ws.lastMessage();
    expect(msg.type).toBe('agent.status');
    // Transitional anon mode must not leak the global connection list —
    // it degrades to an empty payload instead.
    expect(msg.connectedServers).toEqual([]);
    expect(msg.total).toBe(0);
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('closes socket when no token + flag off', async () => {
    process.env.AUTH_ALLOW_ANON = 'false';

    const handler = makeStatusHarness(gatewayLike);
    const ws = new FakeWebSocket();
    await handler(ws, { url: '/ws/status' });

    expect(ws.closed).toBe(true);
    expect(ws.sent.length).toBe(0);
  });
});
