import OpenAI from 'openai';
import { prisma } from '@fivem-ai/db';
import type { ChatMessage, ResourceIndex } from '@prisma/client';

const openai = new OpenAI({
  apiKey: proces..._KEY || 'omni-key',
  baseURL: process.env.OMNIROUTE_BASE_URL || 'http://localhost:20128/v1',
});

export interface ChatContext {
  serverId: string;
  threadId: string;
  userId: string;
  framework: string;
  resources: ResourceIndex[];
  previousMessages: ChatMessage[];
  selectedSkills?: string[];
  isAgentConnected?: boolean;
}

// Predefined skills
const SKILLS = [
  {
    id: 'config-editor',
    name: 'Config Editor',
    description: 'Safely edit configuration files',
    triggerKeywords: ['config', 'settings', 'options'],
    systemPrompt: `You are a FiveM configuration expert. You specialize in:
- Reading and modifying config.lua files
- Understanding framework-specific configurations
- Making minimal, safe changes
- Explaining what each setting does`,
  },
  {
    id: 'vehicle-handler',
    name: 'Vehicle Handler',
    description: 'Modify vehicle handling and specs',
    triggerKeywords: ['vehicle', 'cars', 'handling', 'speed'],
    systemPrompt: `You are a FiveM vehicle specialist. You can help with:
- Modifying vehicle handling (handling.meta)
- Changing vehicle specs (vehicles.meta)
- Adjusting performance settings`,
  },
  {
    id: 'error-fixer',
    name: 'Error Fixer',
    description: 'Analyze and fix console errors',
    triggerKeywords: ['error', 'bug', 'fix', 'problem', 'crash'],
    systemPrompt: `You are a FiveM debugging expert. You specialize in:
- Analyzing console errors
- Identifying root causes
- Suggesting fixes
- Finding missing dependencies`,
  },
  {
    id: 'ui-customizer',
    name: 'UI Customizer',
    description: 'Modify HUD and interface elements',
    triggerKeywords: ['hud', 'ui', 'interface', 'menu', 'colors'],
    systemPrompt: `You are a FiveM UI specialist. You can help with:
- Changing HUD colors and positions
- Modifying menu layouts
- Customizing notification styles`,
  },
  {
    id: 'npc-spawner',
    name: 'NPC Spawner',
    description: 'Add and configure NPCs and peds',
    triggerKeywords: ['npc', 'ped', 'character', 'spawn'],
    systemPrompt: `You are a FiveM NPC specialist. You can help with:
- Adding new NPC spawn points
- Configuring ped models and animations
- Setting up NPC behaviors`,
  },
];

function getActiveSkills(context: ChatContext): typeof SKILLS {
  if (context.selectedSkills && context.selectedSkills.length > 0) {
    return SKILLS.filter(s => context.selectedSkills!.includes(s.id));
  }
  // Return default skills based on framework
  return SKILLS.slice(0, 3);
}

function buildSystemPrompt(context: ChatContext): string {
  const activeSkills = getActiveSkills(context);
  
  const resourcesList = context.resources
    .slice(0, 50)
    .map(r => `- ${r.resourceName} (${r.relativePath})`)
    .join('\n');

  const skillsSection = activeSkills.map(skill => `
## Active Skill: ${skill.name}
${skill.description}
${skill.systemPrompt}`).join('\n');

  const agentStatus = context.isAgentConnected
    ? '\n\n## Agent Status\nYour file-operation tools are available because an agent is connected to this server.'
    : '\n\n## Agent Status\nNo agent is currently connected to this server. File-operation tools (read_remote_file, list_remote_directory, get_resource_index, propose_remote_write) will NOT work. You can still answer questions about FiveM configuration, explain errors, and provide general guidance without using any tools.';

  return `You are a FiveM development assistant helping a server owner make changes to their ${context.framework} server.

## Server Information
- Framework: ${context.framework}
- Server ID: ${context.serverId}

## Active Skills${skillsSection}

## Available Resources
${resourcesList || 'No resources scanned yet'}${agentStatus}

## Your Capabilities
You can help with:
- Reading and explaining configuration files
- Proposing changes to Lua configs, UI files, vehicle handling, NPC spawn points
- Explaining console errors and suggesting fixes
- Finding which resource controls a specific feature
- Installing and configuring resources

## Important Rules
1. NEVER claim you've made changes to files - you can only PROPOSE changes
2. When proposing a change, explain what files will be modified and why
3. Always use the read_remote_file tool to see current content before proposing changes (ONLY if agent is connected)
4. Be concise - FiveM developers want quick answers
5. If you're unsure which resource contains something, ask clarifying questions
6. Use framework-specific conventions (${context.framework})
7. If the agent is NOT connected, do NOT attempt to use any file-operation tools — just answer directly`;
}

function formatMessages(messages: ChatMessage[]): any[] {
  return messages.map(msg => {
    const toolCalls = (msg.toolCalls as any[] | null) ?? [];

    if (msg.role === 'user') {
      return { role: 'user' as const, content: msg.content };
    }

    if (msg.role === 'assistant') {
      if (toolCalls.length > 0) {
        return {
          role: 'assistant' as const,
          content: msg.content,
          tool_calls: toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        };
      }
      return { role: 'assistant', content: msg.content };
    }

    if (msg.role === 'tool') {
      const tc = toolCalls[0];
      return {
        role: 'tool' as const,
        tool_call_id: tc?.id || 'unknown',
        content: msg.content,
      };
    }

    return { role: 'user', content: msg.content };
  });
}

export async function* streamChat(
  context: ChatContext,
  userMessage: string
): AsyncGenerator<{
  type: 'text' | 'tool_use' | 'error';
  content: string;
  toolName?: string;
  toolArgs?: any;
  skillUsed?: string;
}> {
  const systemPrompt = buildSystemPrompt(context);
  const previousMessages = formatMessages(context.previousMessages);
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...previousMessages,
    { role: 'user', content: userMessage },
  ];

  // Only provide tools if agent is connected
  const tools = context.isAgentConnected ? [
    {
      type: 'function' as const,
      function: {
        name: 'read_remote_file',
        description: 'Read a file from the FiveM server.',
        parameters: {
          type: 'object' as const,
          properties: {
            path: { type: 'string', description: 'Relative path from server-data' },
          },
          required: ['path'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'list_remote_directory',
        description: 'List files and directories.',
        parameters: {
          type: 'object' as const,
          properties: {
            path: { type: 'string', description: 'Relative path from server-data' },
          },
          required: ['path'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'get_resource_index',
        description: 'Get detailed info about a resource.',
        parameters: {
          type: 'object' as const,
          properties: {
            resourceName: { type: 'string' },
          },
          required: ['resourceName'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'propose_remote_write',
        description: 'PROPOSE a file change - does not write to disk.',
        parameters: {
          type: 'object' as const,
          properties: {
            path: { type: 'string' },
            newContent: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['path', 'newContent', 'reason'],
        },
      },
    },
  ] : undefined;

  try {
    console.log('[streamChat] calling OmniRoute with model auto/best-coding, tools:', tools ? 'enabled' : 'disabled');
    const stream = await openai.chat.completions.create({
      model: 'auto/best-coding',
      messages,
      stream: true,
      ...(tools ? { tools } : {}),
    });

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      const delta = choice.delta;
      if (delta?.content) {
        yield { type: 'text', content: delta.content };
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.function?.name) {
            yield {
              type: 'tool_use',
              content: '',
              toolName: tc.function.name,
              toolArgs: JSON.parse(tc.function.arguments || '{}'),
            };
          }
        }
      }
    }
  } catch (error: any) {
    console.error('[streamChat] error:', error?.message || error);
    yield { type: 'error', content: error?.message || 'Failed to get response' };
  }
}
