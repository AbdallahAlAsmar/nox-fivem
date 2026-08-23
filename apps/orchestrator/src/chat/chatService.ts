import { prisma } from '@fivem-ai/db';
import type { AgentGateway } from '../ws/agentGateway';
import { streamChat, type ChatContext } from '../claude/session';

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

  const previousMessages = await prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
  });

  await prisma.chatMessage.create({
    data: { threadId, role: 'user', content: userMessage },
  });

  const isAgentConnected = gateway.isConnected(serverId);
  const context: ChatContext = {
    serverId,
    threadId,
    userId,
    orgId: server.orgId || 'dev-org',
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

    while (true) {
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
          const result = await handleToolCall(gateway, serverId, threadId, userId, { orgId: server.orgId || 'dev-org' }, chunk.toolName!, chunk.toolArgs!);
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

        // Update context to include the new messages from DB
        context.previousMessages = await prisma.chatMessage.findMany({
          where: { threadId },
          orderBy: { createdAt: 'asc' },
        });
        
        // Reset turn messages, streamChat will use context.previousMessages
        currentTurnMessages = [];
      } else {
        break; // No tool calls, we're done
      }
    }
  } catch (error: any) {
    onStream({ type: 'error', content: error.message });
  }
}

async function handleToolCall(gateway: AgentGateway, serverId: string, threadId: string, userId: string, user: any, toolName: string, args: any): Promise<any> {
  if (!gateway.isConnected(serverId)) {
    return { error: `Agent is not connected for server ${serverId}. Pair your server first to enable file operations.`, toolName, status: 'disconnected' };
  }

  switch (toolName) {
    case 'read_remote_file':
      return gateway.sendCommand(serverId, 'fs.read', { path: args.path }, 30000);
    case 'list_remote_directory':
      return gateway.sendCommand(serverId, 'fs.list', { path: args.path, recursive: false }, 30000);
    case 'get_resource_index': {
      const resource = await prisma.resourceIndex.findFirst({ where: { serverId, resourceName: args.resourceName } });
      if (!resource) throw new Error(`Resource not found: ${args.resourceName}`);
      return { name: resource.resourceName, path: resource.relativePath, dependencies: resource.dependencies as string[], files: resource.files as string[] };
    }
    case 'propose_remote_write': {
      const currentFile = await gateway.sendCommand(serverId, 'fs.read', { path: args.path }, 30000);
      const change = await prisma.change.create({
        data: {
          serverId,
          threadId,
          createdByUserId: userId,
          filesTouched: [args.path],
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
          metadata: { changeId: change.id, path: args.path, reason: args.reason },
        },
      });
      return { changeId: change.id, path: args.path, reason: args.reason, status: 'staged' };
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
