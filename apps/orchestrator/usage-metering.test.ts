import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Tests for real usage metering in src/claude/session.ts: stream_options
// include_usage, costUsd estimation wired into prisma.usage.create, and
// honest handling of providers that never send a usage chunk.
//
// The 'openai' module is replaced with a fake client whose create() replays a
// caller-supplied chunk list — including the usage-only final chunk (empty
// choices) that real OpenAI-compatible backends emit.
// ---------------------------------------------------------------------------

const usageCreate = vi.fn().mockResolvedValue({});

vi.mock('@fivem-ai/db', () => {
  const prisma = {
    usage: { create: (...args: unknown[]) => usageCreate(...args) },
  };
  return { prisma, default: prisma };
});

type FakeChunk = {
  choices?: Array<{ delta?: { content?: string; tool_calls?: any[] } }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
  model?: string;
};

const state = vi.hoisted(() => ({
  chunks: [] as any[],
  createRequests: [] as any[],
}));

const { streamChat } = await import('./src/claude/session');

vi.mock('openai', () => ({
  default: class FakeOpenAI {
    chat = {
      completions: {
        create: async (req: any) => {
          state.createRequests.push(req);
          return (async function* () {
            for (const c of state.chunks) yield c;
          })();
        },
      },
    };
  },
}));

function baseContext(): any {
  return {
    serverId: 'srv1',
    threadId: 'thread1',
    userId: 'user1',
    orgId: 'org1',
    framework: 'qbcore',
    resources: [],
    previousMessages: [],
    isAgentConnected: false,
  };
}

async function collect(context: any): Promise<string[]> {
  const texts: string[] = [];
  for await (const chunk of streamChat(context, [{ role: 'user', content: 'hi' }])) {
    if (chunk.type === 'text') texts.push(chunk.content);
  }
  return texts;
}

beforeEach(() => {
  vi.clearAllMocks();
  state.chunks = [];
  state.createRequests = [];
});

describe('streamChat usage metering', () => {
  it('requests stream_options.include_usage from the provider', async () => {
    state.chunks = [
      { choices: [{ delta: { content: 'x' } }] },
      { choices: [], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, model: 'm' },
    ];
    await collect(baseContext());

    expect(state.createRequests).toHaveLength(1);
    expect(state.createRequests[0]).toMatchObject({
      model: 'Noxes AI',
      stream: true,
      stream_options: { include_usage: true },
    });
  });

  it('persists tokens + estimated costUsd from the usage-only final chunk', async () => {
    state.chunks = [
      { choices: [{ delta: { content: 'hello world' } }] },
      {
        choices: [],
        usage: { prompt_tokens: 1000, completion_tokens: 2000, total_tokens: 3000 },
        model: 'gpt-4o',
      },
    ];

    const texts = await collect(baseContext());

    expect(texts.join('')).toBe('hello world');
    expect(usageCreate).toHaveBeenCalledTimes(1);
    // gpt-4o static rates: 1000/1M*$2.50 in + 2000/1M*$10.00 out = $0.0225
    expect(usageCreate.mock.calls[0][0].data).toEqual({
      orgId: 'org1',
      threadId: 'thread1',
      tokensIn: 1000,
      tokensOut: 2000,
      costUsd: 0.0225,
      model: 'gpt-4o',
    });
  });

  it('warns instead of writing a row when the provider sends no usage', async () => {
    state.chunks = [{ choices: [{ delta: { content: 'hi there' } }] }];

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await collect(baseContext());
    } finally {
      warn.mockRestore();
    }

    expect(usageCreate).not.toHaveBeenCalled();
  });
});
