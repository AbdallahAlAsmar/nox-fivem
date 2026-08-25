import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// ---------------------------------------------------------------------------
// Mock @fivem-ai/db BEFORE importing the gateway.
// packages/db/src/client.ts exports `prisma` as both named and default export.
// ---------------------------------------------------------------------------

vi.mock('@fivem-ai/db', () => {
  const prisma = {
    agentDevice: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    server: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  return { prisma, default: prisma };
});

import { prisma } from '@fivem-ai/db';

// Minimal WebSocket double: enough surface for the gateway's logic.
class FakeWebSocket extends EventEmitter {
  readyState = 1; // OPEN
  sent: any[] = [];
  closed = false;
  closeCode: number | null = null;

  send(raw: string) {
    this.sent.push(JSON.parse(raw));
  }

  close(code?: number) {
    this.closed = true;
    this.closeCode = code ?? null;
    // Emitting 'close' synchronously mirrors ws behaviour closely enough for
    // these tests; handlers are async but we await flushes explicitly.
    this.emit('close');
  }

  lastMessage() {
    return this.sent[this.sent.length - 1];
  }
}

const mockedFindUnique = prisma.agentDevice.findUnique as ReturnType<typeof vi.fn>;

function makeHelloPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    agentDeviceId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    serverId: '3f2504e0-4f89-11d3-9a0c-0305e82c3302',
    agentVersion: '0.1.0',
    platform: 'windows' as const,
    capabilities: ['fs.read'],
    ...overrides,
  };
}

function makeEnvelope(payload: unknown, type = 'agent.hello') {
  return JSON.stringify({
    protocolVersion: '2026-08-12.v1',
    messageId: '11111111-1111-4111-8111-111111111111',
    type,
    sentAt: new Date().toISOString(),
    payload,
  });
}

async function importGateway() {
  const mod = await import('./src/ws/agentGateway');
  return mod.AgentGateway;
}

// The gateway reads AGENT_LEGACY_OK lazily per hello, so tests can toggle env.

describe('AgentGateway WS auth', () => {
  let AgentGateway: Awaited<ReturnType<typeof importGateway>>;
  const originalEnv = process.env.AGENT_LEGACY_OK;

  beforeEach(async () => {
    vi.resetModules();
    ({ AgentGateway } = { AgentGateway: await importGateway() });
    process.env.AGENT_LEGACY_OK = 'true'; // transitional default
    mockedFindUnique.mockReset();
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.AGENT_LEGACY_OK;
    else process.env.AGENT_LEGACY_OK = originalEnv;
  });

  it('accepts a valid session token (hash matches stored hash)', async () => {
    const gateway = new AgentGateway();
    const ws = new FakeWebSocket();
    gateway.handleConnection(ws as any, { ip: '127.0.0.1' } as any);

    const token = 'valid-session-token';
    const storedHash = (await import('crypto')).createHash('sha256').update(token).digest('hex');
    mockedFindUnique.mockResolvedValue({
      id: 'device-1',
      serverId: makeHelloPayload().serverId,
      status: 'paired',
      pairingTokenHash: storedHash,
      server: {},
    });

    ws.emit('message', Buffer.from(makeEnvelope(makeHelloPayload({ sessionToken: token }))));

    // Allow async handler chain to settle.
    await new Promise((r) => setTimeout(r, 10));

    expect(ws.lastMessage()?.type).toBe('agent.authenticated');
    expect(ws.closed).toBe(false);
  });

  it('rejects an invalid session token with INVALID_TOKEN and closes', async () => {
    const gateway = new AgentGateway();
    const ws = new FakeWebSocket();
    gateway.handleConnection(ws as any, { ip: '127.0.0.1' } as any);

    mockedFindUnique.mockResolvedValue({
      id: 'device-1',
      serverId: makeHelloPayload().serverId,
      status: 'paired',
      pairingTokenHash: 'deadbeef'.repeat(8),
      server: {},
    });

    ws.emit('message', Buffer.from(makeEnvelope(makeHelloPayload({ sessionToken: 'wrong-token' }))));

    await new Promise((r) => setTimeout(r, 10));

    const msg = ws.lastMessage();
    expect(msg?.type).toBe('agent.rejected');
    expect(msg?.payload?.code).toBe('INVALID_TOKEN');
    expect(ws.closed).toBe(true);
  });

  it('rejects duplicate connection while existing connection is fresh (ALREADY_CONNECTED)', async () => {
    const gateway = new AgentGateway();

    const token = 'token-a';
    const storedHash = (await import('crypto')).createHash('sha256').update(token).digest('hex');
    mockedFindUnique.mockResolvedValue({
      id: 'device-1',
      serverId: makeHelloPayload().serverId,
      status: 'paired',
      pairingTokenHash: storedHash,
      server: {},
    });

    // First connection authenticates successfully.
    const first = new FakeWebSocket();
    gateway.handleConnection(first as any, { ip: '127.0.0.1' } as any);
    first.emit('message', Buffer.from(makeEnvelope(makeHelloPayload({ sessionToken: token }))));
    await new Promise((r) => setTimeout(r, 10));
    expect(first.lastMessage()?.type).toBe('agent.authenticated');

    // Second socket with same serverId is rejected without displacing the first.
    const second = new FakeWebSocket();
    gateway.handleConnection(second as any, { ip: '127.0.0.2' } as any);
    second.emit('message', Buffer.from(makeEnvelope(makeHelloPayload({ sessionToken: token }))));
    await new Promise((r) => setTimeout(r, 10));

    const msg = second.lastMessage();
    expect(msg?.type).toBe('agent.rejected');
    expect(msg?.payload?.code).toBe('ALREADY_CONNECTED');
    expect(second.closed).toBe(true);
    expect(gateway.isConnected(makeHelloPayload().serverId)).toBe(true);
  });

  it('accepts legacy hello without token when flag on and stored hash is null', async () => {
    const gateway = new AgentGateway();
    const ws = new FakeWebSocket();
    gateway.handleConnection(ws as any, { ip: '127.0.0.1' } as any);

    mockedFindUnique.mockResolvedValue({
      id: 'device-1',
      serverId: makeHelloPayload().serverId,
      status: 'paired',
      pairingTokenHash: null,
      server: {},
    });

    ws.emit('message', Buffer.from(makeEnvelope(makeHelloPayload()))); // no sessionToken

    await new Promise((r) => setTimeout(r, 10));

    expect(ws.lastMessage()?.type).toBe('agent.authenticated');
    expect(ws.closed).toBe(false);
  });

  it('rejects legacy hello without token when flag is off', async () => {
    process.env.AGENT_LEGACY_OK = 'false';
    const gateway = new AgentGateway();
    const ws = new FakeWebSocket();
    gateway.handleConnection(ws as any, { ip: '127.0.0.1' } as any);

    mockedFindUnique.mockResolvedValue({
      id: 'device-1',
      serverId: makeHelloPayload().serverId,
      status: 'paired',
      pairingTokenHash: null,
      server: {},
    });

    ws.emit('message', Buffer.from(makeEnvelope(makeHelloPayload()))); // no sessionToken

    await new Promise((r) => setTimeout(r, 10));

    const msg = ws.lastMessage();
    expect(msg?.type).toBe('agent.rejected');
    expect(msg?.payload?.code).toBe('INVALID_TOKEN');
    expect(ws.closed).toBe(true);
  });

  it('never registers the connection on rejected hello', async () => {
    const gateway = new AgentGateway();
    const ws = new FakeWebSocket();
    gateway.handleConnection(ws as any, { ip: '127.0.0.1' } as any);

    mockedFindUnique.mockResolvedValue(null); // unknown device

    ws.emit('message', Buffer.from(makeEnvelope(makeHelloPayload({ sessionToken: 'whatever' }))));

    await new Promise((r) => setTimeout(r, 10));

    expect(ws.lastMessage()?.type).toBe('agent.rejected');
    expect(gateway.getConnectedServers()).toEqual([]);
  });

  it('scopes pending-request rejection to the disconnected server only', async () => {
    const gateway = new AgentGateway();

    const mkConn = async (serverId: string, suffix: string) => {
      const token = `tok-${suffix}`;
      const storedHash = (await import('crypto')).createHash('sha256').update(token).digest('hex');
      void storedHash;
      mockedFindUnique.mockImplementation(async (_args: any) =>
        Promise.resolve({
          id: `device-${suffix}`,
          serverId,
          status: 'paired',
          pairingTokenHash: storedHash,
          server: {},
        })
      );

      const ws = new FakeWebSocket();
      gateway.handleConnection(ws as any, { ip: '127.0.0.9' } as any);
      const payload = makeHelloPayload({
        serverId,
        agentDeviceId: `3f2504e0-4f89-11d3-9a0c-0305e82c33${suffix === 'a' ? '01' : '02'}`,
        sessionToken: token,
      });
      ws.emit('message', Buffer.from(makeEnvelope(payload)));
      await new Promise((r) => setTimeout(r, 10));
      expect(ws.lastMessage()?.type).toBe('agent.authenticated');
      return ws;
    };

    const serverA = '3f2504e0-4f89-11d3-9a0c-0305e82c3401';
    const serverB = '3f2504e0-4f89-11d3-9a0c-0305e82c3402';

    await mkConn(serverA, 'a');
    await mkConn(serverB, 'b');

    // Fire one request at each connected agent; keep them pending.
    const neverA = gateway.sendCommand(serverA, 'fs.read', { path: 'x' }, 60_000)
      .then(() => 'resolved', () => 'rejected');
    const neverB = gateway.sendCommand(serverB, 'fs.read', { path: 'x' }, 60_000)
      .then(() => 'resolved', () => 'rejected');

    // Simulate an unclean drop of A's socket WITHOUT its own cleanup pass:
    // grab the internal connection map through public API instead — force
    // disconnect only A.
    gateway.forceDisconnect(serverA);
    await new Promise((r) => setTimeout(r, 20));

    const outcomeA = await Promise.race([neverA, Promise.resolve('pending')]);
    const outcomeB = await Promise.race([neverB, Promise.resolve('pending')]);

    expect(outcomeA).toBe('rejected'); // scoped to disconnected server
    expect(outcomeB).toBe('pending');  // untouched by A's disconnect

    gateway.forceDisconnect(serverB);
  });

  it('kick-stale: old socket close must NOT reject requests routed to the new connection', async () => {
    const gateway = new AgentGateway();
    const serverId = '3f2504e0-4f89-11d3-9a0c-0305e82c3407';
    const storedHash = (await import('crypto')).createHash('sha256').update('tok').digest('hex');
    mockedFindUnique.mockResolvedValue({
      id: 'device-kick',
      serverId,
      status: 'paired',
      pairingTokenHash: storedHash,
      server: {},
    });

    const helloOn = async (ws: FakeWebSocket, deviceId: string) => {
      ws.emit('message', Buffer.from(makeEnvelope(makeHelloPayload({
        serverId,
        agentDeviceId: deviceId,
        sessionToken: 'tok',
      }))));
      await new Promise((r) => setTimeout(r, 10));
      return ws.lastMessage()?.type;
    };

    // First connection takes the slot.
    const oldWs = new FakeWebSocket();
    gateway.handleConnection(oldWs as any, { ip: '127.0.0.5' } as any);
    expect(await helloOn(oldWs, '3f2504e0-4f89-11d3-9a0c-0305e82c3308')).toBe('agent.authenticated');

    // Age its heartbeat past DUPLICATE_FRESH_MS so the next hello treats it
    // as a stale duplicate and KICKS it (the takeover path in handleHello).
    const oldConn = (gateway as any).connections.get(serverId);
    oldConn.lastHeartbeat = new Date(Date.now() - 120_000);

    const newWs = new FakeWebSocket();
    gateway.handleConnection(newWs as any, { ip: '127.0.0.6' } as any);
    expect(await helloOn(newWs, '3f2504e0-4f89-11d3-9a0c-0305e82c3309')).toBe('agent.authenticated');
    expect(gateway.isConnected(serverId)).toBe(true);
    // The kick itself closed the old socket synchronously (fake ws behaviour);
    // the new connection now owns the slot.
    expect((gateway as any).connections.get(serverId)).not.toBe(oldConn);

    // A request arrives and is routed to the NEW connection.
    const reqPromise = gateway.sendCommand(serverId, 'fs.read', { path: 'x' }, 60_000)
      .then(() => 'resolved', () => 'rejected');
    await new Promise((r) => setTimeout(r, 5));
    expect(newWs.sent.some((m: any) => m.type === 'agent.request')).toBe(true);

    // NOW the OLD socket's close event arrives late (unclean network teardown
    // surfacing after its replacement registered). Regression: this used to
    // run the pending-request rejection loop unconditionally and killed the
    // request that belongs to the new connection.
    oldWs.emit('close');
    await new Promise((r) => setTimeout(r, 20));

    const outcome = await Promise.race([reqPromise, Promise.resolve('pending')]);
    expect(outcome).toBe('pending'); // still owned by the live connection
    expect(gateway.isConnected(serverId)).toBe(true);

    // Sanity: answering over the new socket resolves normally afterwards.
    gateway.forceDisconnect(serverId);
    await new Promise((r) => setTimeout(r, 20)); // close handler is async
    const finalOutcome = await Promise.race([reqPromise, Promise.resolve('pending')]);
    expect(finalOutcome).toBe('rejected');
  });
});
