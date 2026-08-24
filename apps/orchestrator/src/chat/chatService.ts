import { prisma } from '@fivem-ai/db';
import type { AgentGateway } from '../ws/agentGateway';
import { streamChat, type ChatContext } from '../claude/session';
import { estimateCostUsd } from '../claude/pricing';
import { sanitizeRelativePath } from '../http/pathGuard';

export const MAX_TOOL_ITERATIONS = 10;
const HISTORY_WINDOW = 30;

/** Thrown when an org's conversation or monthly cost cap blocks a chat turn. */
export class ChatCapError extends Error {
  readonly scope: 'conversation' | 'monthly';
  readonly limit: number;

  constructor(scope: 'conversation' | 'monthly', limit: number) {
    super(
      scope === 'monthly'
        ? `Monthly cost cap of $${limit.toFixed(2)} reached for this organization.`
        : `Conversation cost cap of $${limit.toFixed(2)} reached for this thread.`
    );
    this.name = 'ChatCapError';
    this.scope = scope;
    this.limit = limit;
  }
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Sum estimated costs of the current thread's usage rows (conversation cap)
 * plus the org's calendar-month total (monthly cap), and throw ChatCapError
 * when either is at/over its configured Organization cap.
 */
export async function assertWithinCostCaps(orgId: string, threadId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      conversation_cost_cap_usd: true,
      monthly_cost_cap_usd: true,
    },
  });
  if (!org) return; // No org row — nothing to enforce against.

  const conversationCap =
    org.conversation_cost_cap_usd != null ? Number(org.conversation_cost_cap_usd) : null;
  if (conversationCap !== null && conversationCap >= 0) {
    const agg = await prisma.usage.aggregate({
      where: { threadId },
      _sum: { costUsd: true },
    });
    const spent = Number(agg._sum.costUsd ?? 0);
    if (spent >= conversationCap) {
      throw new ChatCapError('conversation', conversationCap);
    }
  }

  const monthlyCap = org.monthly_cost_cap_usd != null ? Number(org.monthly_cost_cap_usd) : null;
  if (monthlyCap !== null && monthlyCap >= 0) {
    const agg = await prisma.usage.aggregate({
      where: { orgId, createdAt: { gte: startOfMonth() } },
      _sum: { costUsd: true },
    });
    const spent = Number(agg._sum.costUsd ?? 0);
    if (spent >= monthlyCap) {
      throw new ChatCapError('monthly', monthlyCap);
    }
  }
}

/**
 * Mid-turn re-check used between tool-loop iterations. Each completed LLM call
 * persists its Usage row (see claude/session.ts), so aggregating by threadId
 * here sees the running cost of THIS turn plus everything before it — no
 * caller-side accumulation needed.
 */
async function recheckConversationCap(context: ChatContext): Promise<void> {
  if (!context.orgId) return;
  const org = await prisma.organization.findUnique({
    where: { id: context.orgId },
    select: { conversation_cost_cap_usd: true },
  });
  const conversationCap =
    org?.conversation_cost_cap_usd != null ? Number(org.conversation_cost_cap_usd) : null;
  if (conversationCap === null || conversationCap < 0) return;

  const agg = await prisma.usage.aggregate({
    where: { threadId: context.threadId },
    _sum: { costUsd: true },
  });
  const spent = Number(agg._sum.costUsd ?? 0);
  if (spent >= conversationCap) {
    throw new ChatCapError('conversation', conversationCap);
  }
}

export async function handleChatMessage(
  gateway: AgentGateway,
  serverId: string,
  threadId: string,
  userId: string,
  userMessage: string,
  onStream: (chunk: { type: string; content: string; skillUsed?: string }) => void,
  selectedSkills?: string[]
): Promise<void> {
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    include: { resources: true },
  });

  if (!server) throw new Error('Server not found');

  const allPreviousMessages = await prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
  });
  // Window history to the last N messages so long threads don't grow the
  // prompt (and its token cost) without bound.
  const previousMessages =
    allPreviousMessages.length > HISTORY_WINDOW
      ? allPreviousMessages.slice(-HISTORY_WINDOW)
      : allPreviousMessages;

  // Enforce org cost caps BEFORE the first LLM call of the turn. Thrown
  // ChatCapError propagates to the HTTP layer, which maps it to a typed 402.
  await assertWithinCostCaps(server.orgId, threadId);

  await prisma.chatMessage.create({
    data: { threadId, role: 'user', content: userMessage },
  });

  const isAgentConnected = gateway.isConnected(serverId);
  // orgId always comes from the DB row for this server — callers must have
  // already verified the caller's org owns it before invoking the chat flow.
  const context: ChatContext = {
    serverId,
    threadId,
    userId,
    orgId: server.orgId,
    framework: server.framework,
    resources: server.resources,
    previousMessages,
    selectedSkills,
    isAgentConnected,
  };

  let assistantContent = '';
  const toolCalls: any[] = [];

  try {
    let currentTurnMessages: any[] = [{ role: 'user', content: userMessage }];
    let iterations = 0;

    while (true) {
      // Hard stop for runaway tool loops — without it a model that keeps
      // requesting tools would loop (and spend) indefinitely.
      if (++iterations > MAX_TOOL_ITERATIONS) {
        const limitMsg = 'Reached tool-call limit for this turn.';
        onStream({ type: 'text', content: `\n\n${limitMsg}` });
        await prisma.chatMessage.create({
          data: { threadId, role: 'assistant', content: limitMsg, model: 'Noxes AI' },
        });
        break;
      }

      let assistantContent = '';
      const toolCalls: any[] = [];
      let hasToolCalls = false;
      let toolError = false;

      for await (const chunk of streamChat(context, currentTurnMessages)) {
        if (chunk.type === 'text') {
          assistantContent += chunk.content;
          onStream({ type: 'text', content: chunk.content, skillUsed: chunk.skillUsed });
        } else if (chunk.type === 'tool_use') {
          hasToolCalls = true;
          if (!isAgentConnected) {
            onStream({ type: 'error', content: `Agent is not connected for server ${serverId}. Pair your server first to enable file operations.` });
            toolError = true;
            break;
          }
          const result = await handleToolCall(gateway, serverId, threadId, userId, { orgId: server.orgId }, chunk.toolName!, chunk.toolArgs!);
          toolCalls.push({ id: chunk.toolId || crypto.randomUUID(), name: chunk.toolName, arguments: chunk.toolArgs, result });
          onStream({ type: 'tool_result', content: JSON.stringify(result) });
        }
      }

      if (toolError) break;

      // Save assistant message to DB
      await prisma.chatMessage.create({
        data: {
          threadId,
          role: 'assistant',
          content: assistantContent,
          toolCalls,
          model: 'Noxes AI',
        },
      });

      if (hasToolCalls) {
        // Save tool results as separate messages so the LLM remembers them
        for (const tc of toolCalls) {
          await prisma.chatMessage.create({
            data: {
              threadId,
              role: 'tool',
              content: typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result),
              toolCalls: [tc],
              model: 'Noxes AI',
            },
          });
        }

        // Update context to include the new messages from DB, windowed to the
        // same HISTORY_WINDOW bound as the initial load.
        const allMessages = await prisma.chatMessage.findMany({
          where: { threadId },
          orderBy: { createdAt: 'asc' },
        });
        context.previousMessages =
          allMessages.length > HISTORY_WINDOW ? allMessages.slice(-HISTORY_WINDOW) : allMessages;

        // Each completed LLM call above persisted its Usage row — re-check the
        // conversation cap before paying for another tool-loop iteration.
        await recheckConversationCap(context);

        // Reset turn messages, streamChat will use context.previousMessages
        currentTurnMessages = [];
      } else {
        break; // No tool calls, we're done
      }
    }
  } catch (error: any) {
    // Cost-cap rejections are typed control flow, not stream errors — let them
    // propagate so the HTTP layer can answer with the typed 402 shape.
    if (error instanceof ChatCapError) throw error;
    onStream({ type: 'error', content: error.message });
  }
}

async function handleToolCall(gateway: AgentGateway, serverId: string, threadId: string, userId: string, user: any, toolName: string, args: any): Promise<any> {
  if (!gateway.isConnected(serverId)) {
    return { error: `Agent is not connected for server ${serverId}. Pair your server first to enable file operations.`, toolName, status: 'disconnected' };
  }

  switch (toolName) {
    case 'read_remote_file': {
      const safe = sanitizeRelativePath(String(args.path ?? ''));
      if (!safe) return { error: `Unsafe path rejected: ${args.path}`, toolName, status: 'rejected' };
      return gateway.sendCommand(serverId, 'fs.read', { path: safe }, 30000);
    }
    case 'list_remote_directory': {
      const safe = sanitizeRelativePath(String(args.path ?? ''));
      if (!safe) return { error: `Unsafe path rejected: ${args.path}`, toolName, status: 'rejected' };
      return gateway.sendCommand(serverId, 'fs.list', { path: safe, recursive: false }, 30000);
    }
    case 'get_resource_index': {
      const resource = await prisma.resourceIndex.findFirst({ where: { serverId, resourceName: args.resourceName } });
      if (!resource) throw new Error(`Resource not found: ${args.resourceName}`);
      return { name: resource.resourceName, path: resource.relativePath, dependencies: resource.dependencies as string[], files: resource.files as string[] };
    }
    case 'propose_remote_write': {
      const safe = sanitizeRelativePath(String(args.path ?? ''));
      if (!safe) {
        return { error: `Unsafe path rejected: ${args.path}`, toolName, status: 'rejected' };
      }
      const currentFile = await gateway.sendCommand(serverId, 'fs.read', { path: safe }, 30000);
      const change = await prisma.change.create({
        data: {
          serverId,
          threadId,
          createdByUserId: userId,
          filesTouched: [safe],
          diff: generateDiff(currentFile?.content ?? '', args.newContent),
          status: 'pending',
        },
      });
      // Log audit event
      await prisma.auditLog.create({
        data: {
          orgId: user.orgId,
          serverId,
          userId,
          action: 'change.proposed',
          metadata: { changeId: change.id, path: safe, reason: args.reason },
        },
      });
      return { changeId: change.id, path: safe, reason: args.reason, status: 'staged' };
    }
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

function generateDiff(oldContent: string, newContent: string): string {
  const lines = ['```diff', '--- Current', '+++ Proposed', ''];
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const maxLines = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    if (oldLine !== undefined && newLine !== undefined) {
      if (oldLine !== newLine) { lines.push(`-${oldLine}`); lines.push(`+${newLine}`); }
      else { lines.push(` ${oldLine}`); }
    } else if (oldLine !== undefined) { lines.push(`-${oldLine}`); }
    else if (newLine !== undefined) { lines.push(`+${newLine}`); }
  }
  lines.push('```');
  return lines.join('\n');
}
