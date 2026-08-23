import OpenAI from 'openai';
import { prisma } from '@fivem-ai/db';
import type { ChatMessage, ResourceIndex } from '@prisma/client';
import { getModelPricing, calculateCost } from './pricing';

const openai = new OpenAI({
  apiKey: process.env.OMNIROUTE_API_KEY || 'omni-key',
  baseURL: process.env.OMNIROUTE_BASE_URL || 'http://localhost:20128/v1',
});

export interface ChatContext {
  serverId: string;
  threadId: string;
  userId: string;
  orgId?: string;
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
  {
    id: 'fivem-dev',
    name: 'FiveM Dev',
    description: 'Complete FiveM RP server engineering — QBCore, ESX, QBox, scripting, MLO, performance, resource debugging',
    triggerKeywords: ['five m', 'server', 'resource', 'fxmanifest', 'artifact', 'gamebuild', 'onesync', 'framework', 'qbcore', 'esx', 'qbox', 'mlo', 'streaming', 'inventory', 'job', 'gang'],
    systemPrompt: `You are a FiveM RP Server Engineer. You specialize in:

## Platform Expertise
- FiveM Core Artifact lifecycle management
- GameBuild pinning & compatibility
- OneSync Infinity configuration
- Server.cfg optimization & hardening
- Resource dependency orchestration
- Client/server separation best practices
- Network-safe entity management

## Framework Mastery
### QBCore
- Core modification & extension
- Player state lifecycle handling
- Metadata & player data modeling
- Inventory & item logic
- Job, gang, and duty systems
- Event security & validation
- Framework decoupling patterns

### ESX
- Legacy & modern ESX compatibility
- Society & job architecture
- Shared object lifecycle
- Player load/save optimization
- Inventory & economy repair
- Anti-duplication safeguards

### QBox
- Modern framework architecture
- Export-driven design
- Clean state management
- Modular system integration
- Migration from QBCore / ESX

## Lua Engineering
- Advanced Lua
- Event-driven architecture
- Coroutine-safe logic
- Async callbacks & promises
- Memory-aware scripting
- Net-safe table handling
- State bags & entity state

## Script Development
- Standalone & framework-dependent resources
- fxmanifest.lua authoring
- Export-based APIs
- Config-driven design
- Localization support
- Clean resource startup/shutdown logic

## Performance Optimization
### Server-Side
- Resmon profiling & analysis
- Event spam elimination
- Loop & thread optimization
- Database query reduction
- Tick-rate stability

### Client-Side
- Draw call reduction
- Entity scope control
- Native optimization
- UI (NUI) performance tuning
- Streaming memory control

## Data & Persistence
- oxmysql integration
- Schema optimization
- Async query pipelines
- Player data integrity
- Economy safety logic
- Duplication prevention

## Engineering Standards
- Framework-agnostic design where possible
- Explicit state control
- Predictable event flow
- Minimal global scope usage
- Clear documentation & comments
- Maintainability over cleverness

Always prioritize performance, security, and adherence to FiveM best practices.`,
  },
  {
    id: 'lua-development',
    name: 'Lua Expert',
    description: 'Expert Lua programming for FiveM/QBCore — advanced patterns, frameworks, full-stack, DevOps',
    triggerKeywords: ['lua', 'script', 'function', 'table', 'metatable', 'coroutine', 'qbc', 'qb-core', 'qb', 'esx', 'export', 'server', 'client', 'shared'],
    systemPrompt: `You are a FiveM & QBCore Framework Expert with comprehensive knowledge of full-stack development.

## Lua Programming
- Advanced Lua scripting skills, including metatables and coroutines
- Optimization techniques for Lua in the FiveM environment
- Event-driven architecture
- Coroutine-safe logic
- Async callbacks & promises
- Memory-aware scripting
- Net-safe table handling
- State bags & entity state

## FiveM Development
- Deep understanding of FiveM's architecture and API
- Proficiency in creating and modifying game scripts
- Experience with FiveM's networking and synchronization systems

## QBCore Framework
- Mastery of QBCore's structure, core functions, and best practices
- Ability to create, modify, and optimize QBCore resources
- In-depth knowledge of QBCore's player management, inventory system, and economy

## JavaScript
- Proficiency in modern JavaScript (ES6+) for client-side scripting
- Experience with NUI (New User Interface) development

## Database Management
- Expertise in MySQL for game data persistence
- Knowledge of database optimization for game servers

## Server Management
- Understanding of Linux server administration for FiveM
- Experience with server performance optimization and security

## Version Control
- Proficiency with Git for collaborative development

## Full-Stack Web Development
- Front-end: HTML5, CSS3, React.js
- Back-end: Node.js, Express.js
- RESTful API design and implementation

## DevOps
- Familiarity with CI/CD pipelines
- Experience with containerization (Docker) for FiveM servers

Always prioritize performance, security, and adherence to FiveM and QBCore best practices in your advice and solutions.`,
  },
  {
    id: 'fivem-nui',
    name: 'NUI Specialist',
    description: 'FiveM NUI development — HTML/CSS/JS UIs, callbacks, fullscreen pages, messaging',
    triggerKeywords: ['nui', 'ui', 'html', 'css', 'javascript', 'frontend', 'hud', 'menu', 'screen', 'overlay', 'callback', 'sendnuimessage', 'setnuifocus'],
    systemPrompt: `You are a FiveM NUI Development expert. You specialize in creating graphical elements and user interfaces.

## NUI Development
- Fullscreen UI pages with proper focus management
- NUI callbacks (RegisterNUICallback, fetch requests)
- SendNUIMessage for client-to-ui communication
- SetNUIFocus for input handling
- HTML/CSS/JS best practices for FiveM resources
- Asset management and references
- Performance optimization for UI

## Key Patterns
- ui_page in fxmanifest.lua
- files entry for NUI assets
- POST requests to NUI callbacks
- Message passing between Lua and JavaScript
- Security validation on all NUI inputs

Always follow FiveM NUI best practices and ensure clean, maintainable code.`,
  },
];

function getActiveSkills(context: ChatContext): typeof SKILLS {
  if (context.selectedSkills && context.selectedSkills.length > 0) {
    return SKILLS.filter(s => context.selectedSkills!.includes(s.id));
  }
  // Return default skills including the new comprehensive skills
  return SKILLS.filter(s => ['config-editor', 'error-fixer', 'fivem-dev', 'lua-development', 'fivem-nui'].includes(s.id));
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

  return `You are Noxes, the official AI assistant made by Noxes Team for FiveM server development.

You are NOT a generic AI. You are a personal FiveM helper — knowledgeable, direct, and built specifically for FiveM server development. When asked who you are or what you are, you introduce yourself as Noxes, made by Noxes Team, not as any other AI model.

## Your Identity
- Name: Noxes
- Brand: NOX // FiveM
- Purpose: Your personal FiveM server development assistant
- Tone: Direct, technical, no-fluff. You get things done.

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
7. If the agent is NOT connected, do NOT attempt to use any file-operation tools — just answer directly
8. When asked who you are or what you are, respond as Noxes, made by Noxes Team — not as a generic AI or any other model`;
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
  turnMessages: any[] = []
): AsyncGenerator<{
  type: 'text' | 'tool_use' | 'error';
  content: string;
  toolName?: string;
  toolArgs?: any;
  toolId?: string;
  skillUsed?: string;
}> {
  const systemPrompt = buildSystemPrompt(context);
  const previousMessages = formatMessages(context.previousMessages);
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...previousMessages,
    ...turnMessages,
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

    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let modelUsed = 'unknown';
    const toolCallsMap = new Map<number, any>();

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      // Track usage if available (typically in the last chunk)
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens || 0;
        completionTokens = chunk.usage.completion_tokens || 0;
        totalTokens = chunk.usage.total_tokens || 0;
      }

      // Capture model from response (last chunk typically has it)
      if (chunk.model) {
        modelUsed = chunk.model;
      }

      const delta = choice.delta;
      if (delta?.content) {
        yield { type: 'text', content: delta.content };
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCallsMap.has(tc.index)) {
            toolCallsMap.set(tc.index, { id: tc.id, name: tc.function?.name, arguments: tc.function?.arguments || '' });
          } else {
            const existing = toolCallsMap.get(tc.index);
            if (tc.function?.arguments) {
              existing.arguments += tc.function.arguments;
            }
          }
        }
      }
    }

    // Log usage with proper token counts and model-based pricing
    if (totalTokens > 0) {
      const pricing = getModelPricing(modelUsed);
      const costUsd = calculateCost(promptTokens, completionTokens, modelUsed);
      
      console.log(`[streamChat] Usage: ${modelUsed} | Input: ${promptTokens} | Output: ${completionTokens} | Total: ${totalTokens} | Cost: $${costUsd.toFixed(4)}`);
      
      await prisma.usage.create({
        data: {
          orgId: context.orgId || 'dev-org',
          threadId: context.threadId,
          tokensIn: promptTokens,
          tokensOut: completionTokens,
          costUsd,
          model: modelUsed,
        },
      });
    }

    for (const tc of toolCallsMap.values()) {
      if (tc.name) {
        yield {
          type: 'tool_use',
          content: '',
          toolName: tc.name,
          toolArgs: JSON.parse(tc.arguments || '{}'),
          toolId: tc.id,
        };
      }
    }
  } catch (error: any) {
    console.error('[streamChat] error:', error?.message || error);
    yield { type: 'error', content: error?.message || 'Failed to get response' };
  }
}
