import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Tests for org cost-cap enforcement in src/chat/chatService.ts.
//
// prisma is mocked (named + default, mirroring http-routes.test.ts) and
// claude/session's streamChat is mocked so handleChatMessage can be driven
// through its real loop: entry cap check → LLM turn → tool loop → mid-loop
// cap re-check.
// ---------------------------------------------------------------------------

const { organizationFindUnique, usageAggregate } = vi.hoisted(() => ({
  organizationFindUnique: vi.fn(),
  usageAggregate: vi.fn(),
}));

vi.mock('@fivem-ai/db', () => {
  const prisma = {
    organization: { findUnique: organizationFindUnique },
    usage: { aggregate: usageAggregate, create: vi.fn().mockResolvedValue({}) },
    server: { findUnique: vi.fn(), findFirst: vi.fn() },
    resourceIndex: { findFirst: vi.fn() },
    chatMessage: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn() },
    change: { create: vi.fn() },
  };
  return { prisma, default: prisma };
});

const { mockStreamChat } = vi.hoisted(() => ({ mockStreamChat: vi.fn() }));
vi.mock('./src/claude/session', () => ({
  streamChat: (...args: unknown[]) => mockStreamChat(...args),
}));

const { assertWithinCostCaps, handleChatMessage, ChatCapError } = await import(
  './src/chat/chatService'
);
// Imported after the module under test so the mock factory has run.
const { prisma } = await import('@fivem-ai/db');

function spend(usd: number) {
  return { _sum: { costUsd: usd } };
}

/** Default prisma wiring for handleChatMessage runs. */
function armChatFlow(opts: {
  orgCaps: { conversation: number | null; monthly: number | null };
  threadSpend: number;
}) {
  (prisma.server.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: 'srv1',
    orgId: 'org1',
    framework: 'qbcore',
    resources: [],
  });
  organizationFindUnique.mockResolvedValue({
    conversation_cost_cap_usd: opts.orgCaps.conversation,
    monthly_cost_cap_usd: opts.orgCaps.monthly,
  });
  // thread-scoped aggregates see the running thread spend; org+month scoped
  // aggregates (they carry createdAt) see the month-to-date spend.
  usageAggregate.mockImplementation(async ({ where }: any) =>
    where?.createdAt ? spend(0) : spend(opts.threadSpend),
  );
}

const noopStream = () => {};

beforeEach(() => {
  vi.clearAllMocks();
  mockStreamChat.mockReset();
});

describe('assertWithinCostCaps', () => {
  it('passes when no org row exists', async () => {
    organizationFindUnique.mockResolvedValue(null);
    await expect(assertWithinCostCaps('org1', 'thread1')).resolves.toBeUndefined();
    expect(usageAggregate).not.toHaveBeenCalled();
  });

  it('passes when both caps are null (no enforcement configured)', async () => {
    organizationFindUnique.mockResolvedValue({
      conversation_cost_cap_usd: null,
      monthly_cost_cap_usd: null,
    });
    await expect(assertWithinCostCaps('org1', 'thread1')).resolves.toBeUndefined();
    expect(usageAggregate).not.toHaveBeenCalled();
  });

  it('throws ChatCapError(conversation) at exactly the cap boundary', async () => {
    organizationFindUnique.mockResolvedValue({
      conversation_cost_cap_usd: 2,
      monthly_cost_cap_usd: null,
    });
    usageAggregate.mockResolvedValue(spend(2));

    await expect(assertWithinCostCaps('org1', 'thread1')).rejects.toMatchObject({
      name: 'ChatCapError',
      scope: 'conversation',
      limit: 2,
    });
  });

  it('passes strictly under the conversation cap', async () => {
    organizationFindUnique.mockResolvedValue({
      conversation_cost_cap_usd: 2,
      monthly_cost_cap_usd: null,
    });
    usageAggregate.mockResolvedValue(spend(1.99));

    await expect(assertWithinCostCaps('org1', 'thread1')).resolves.toBeUndefined();
  });

  it('throws ChatCapError(monthly) when month-to-date spend reaches the monthly cap', async () => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    organizationFindUnique.mockResolvedValue({
      conversation_cost_cap_usd: null,
      monthly_cost_cap_usd: 20,
    });
    usageAggregate.mockImplementation(async ({ where }: any) =>
      where?.createdAt ? spend(20) : spend(0),
    );

    await expect(assertWithinCostCaps('org1', 'thread1')).rejects.toMatchObject({
      name: 'ChatCapError',
      scope: 'monthly',
      limit: 20,
    });

    const monthlyCall = usageAggregate.mock.calls.find((c: any[]) => c[0]?.where?.createdAt);
    expect(monthlyCall).toBeDefined();
    expect((monthlyCall![0].where.createdAt.gte as Date).getTime()).toBe(monthStart.getTime());
  });

  it('checks conversation first when both caps are exceeded', async () => {
    organizationFindUnique.mockResolvedValue({
      conversation_cost_cap_usd: 2,
      monthly_cost_cap_usd: 5,
    });
    usageAggregate.mockResolvedValue(spend(99));

    await expect(assertWithinCostCaps('org1', 'thread1')).rejects.toMatchObject({
      scope: 'conversation',
    });
  });
});

describe('handleChatMessage cost-cap enforcement', () => {
  it('throws ChatCapError out of handleChatMessage when the entry check trips', async () => {
    armChatFlow({ orgCaps: { conversation: 2, monthly: 100 }, threadSpend: 2 });
    mockStreamChat.mockReturnValue((async function* () {})());

    await expect(
      handleChatMessage({} as any, 'srv1', 'thread1', 'user1', 'hi', noopStream),
    ).rejects.toBeInstanceOf(ChatCapError);

    // Cap check runs BEFORE any LLM call.
    expect(mockStreamChat).not.toHaveBeenCalled();
  });

  it('re-checks the cap between tool-loop iterations and aborts the loop', async () => {
    armChatFlow({ orgCaps: { conversation: 2, monthly: 100 }, threadSpend: 0 });
    // Thread-spend reads, in order: $0 at the entry check, then $3 at the
    // post-iteration re-check — over the $2 conversation cap.
    usageAggregate.mockReset();
    usageAggregate
      .mockResolvedValueOnce(spend(0))
      .mockResolvedValueOnce(spend(0))
      .mockResolvedValue(spend(3));
    // Iteration 1 requests a tool; iteration 2 would start but the cap
    // re-check throws first.
    mockStreamChat
      .mockImplementationOnce(() =>
        (async function* () {
          yield { type: 'tool_use', content: '', toolName: 'read_remote_file', toolArgs: { path: 'a.lua' }, toolId: 't1' };
        })(),
      )
      .mockImplementationOnce(() =>
        (async function* () {
          yield { type: 'text', content: 'should never stream' };
        })(),
      );

    const chunks: string[] = [];
    await expect(
      handleChatMessage(
        { isConnected: () => true, sendCommand: vi.fn().mockResolvedValue({ content: 'x' }) } as any,
        'srv1',
        'thread1',
        'user1',
        'hi',
        (c) => {
          if (c.type === 'text') chunks.push(c.content);
        },
      ),
    ).rejects.toBeInstanceOf(ChatCapError);

    expect(mockStreamChat).toHaveBeenCalledTimes(1);
    expect(chunks.join('')).not.toContain('never');
  });

  it('completes a normal under-cap turn without throwing', async () => {
    armChatFlow({ orgCaps: { conversation: 2, monthly: 100 }, threadSpend: 0.01 });
    mockStreamChat.mockImplementationOnce(() =>
      (async function* () {
        yield { type: 'text', content: 'hello' };
      })(),
    );

    await expect(
      handleChatMessage({ isConnected: () => false } as any, 'srv1', 'thread1', 'user1', 'hi', noopStream),
    ).resolves.toBeUndefined();

    expect(mockStreamChat).toHaveBeenCalledTimes(1);
  });

  it('stops runaway tool loops at MAX_TOOL_ITERATIONS', async () => {
    armChatFlow({ orgCaps: { conversation: 9999, monthly: 9999 }, threadSpend: 0 });
    mockStreamChat.mockImplementation(() =>
      (async function* () {
        yield { type: 'tool_use', content: '', toolName: 'read_remote_file', toolArgs: { path: 'a.lua' }, toolId: 't' };
      })(),
    );

    const texts: string[] = [];
    await handleChatMessage(
      { isConnected: () => true, sendCommand: vi.fn().mockResolvedValue({ content: 'x' }) } as any,
      'srv1',
      'thread1',
      'user1',
      'hi',
      (c) => {
        if (c.type === 'text') texts.push(c.content);
      },
    );

    expect(mockStreamChat).toHaveBeenCalledTimes(10);
    expect(texts.join('')).toContain('Reached tool-call limit for this turn.');
  });
});
