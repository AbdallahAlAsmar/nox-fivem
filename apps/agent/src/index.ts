import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import WebSocket from 'ws';
import { config } from './config';
import { FilesystemActions } from './fs/filesystem';
import { GitActions } from './git/git';
import { FiveMActions } from './fivem/fivem';
import { Scanner } from './scanner/scanner';
import {
  createEnvelope,
  createResponse,
  ErrorCodes,
  createError,
  type AgentRequest,
  type AgentResponse,
} from '@fivem-ai/shared/protocol';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();
const CONFIG_PATH = path.join(process.cwd(), 'fivem-agent.json');

// Helper to save config
function saveConfig(data: Record<string, any>): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
  console.log(chalk.green('✓ Config saved to', CONFIG_PATH));
}

// Helper to load config
function loadConfig(): Record<string, any> | null {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

program
  .name('fivem-agent')
  .description('FiveM AI Developer - Desktop Agent')
  .version('0.1.0');

// Pair command
program
  .command('pair')
  .description('Pair the agent with your dashboard')
  .action(async () => {
    console.log(chalk.blue('FiveM AI Developer Agent - Pairing\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'pairingCode',
        message: 'Enter your pairing code (from dashboard):',
        validate: (input) => {
          if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(input)) {
            return 'Invalid pairing code format. Expected: XXXX-XXXX';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'serverDataPath',
        message: 'Enter the path to your server-data folder:',
        default: 'C:/FXServer/server-data',
        validate: (input) => {
          if (!fs.existsSync(input)) {
            return 'Path does not exist';
          }
          return true;
        },
      },
    ]);

    console.log(chalk.gray('\nPairing with orchestrator...'));

    try {
      const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3001';
      const response = await fetch(`${orchestratorUrl}/api/pairing/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairingCode: answers.pairingCode,
          agentVersion: '0.1.0',
          platform: process.platform === 'win32' ? 'windows' : 'linux',
          rootLabel: answers.serverDataPath,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Pairing failed');
      }

      const data = (await response.json()) as { serverId: string; agentDeviceId: string; wsUrl: string };

      // Save config
      saveConfig({
        serverId: data.serverId,
        agentDeviceId: data.agentDeviceId,
        wsUrl: data.wsUrl,
        serverDataPath: answers.serverDataPath,
      });

      console.log(chalk.green('✓ Paired successfully!'));
      console.log(chalk.gray(`\nServer: ${data.serverId}`));
      console.log(chalk.gray('You can now start the agent with: fivem-agent start'));
    } catch (error: any) {
      console.error(chalk.red('Failed to pair:'), error.message);
      process.exit(1);
    }
  });

// Start command
program
  .command('start')
  .description('Start the agent and connect to orchestrator')
  .action(async () => {
    console.log(chalk.blue('FiveM AI Developer Agent - Starting\n'));

    const savedConfig = loadConfig();

    if (!savedConfig?.serverId || !savedConfig?.agentDeviceId) {
      console.error(chalk.red('Error: Agent not paired. Run `fivem-agent pair` first.'));
      process.exit(1);
    }

    const serverId = savedConfig.serverId;
    const agentDeviceId = savedConfig.agentDeviceId;
    const wsUrl = savedConfig.wsUrl || config.orchestratorWsUrl;
    const serverDataPath = savedConfig.serverDataPath || config.serverDataPath;

    console.log(chalk.gray(`Server ID: ${serverId}`));
    console.log(chalk.gray(`Server data: ${serverDataPath}`));
    console.log(chalk.gray(`Connecting to ${wsUrl}...`));

    // Initialize action handlers
    const fsActions = new FilesystemActions(serverDataPath);
    const gitActions = new GitActions(serverDataPath);
    const fivemActions = new FiveMActions();
    const scanner = new Scanner(serverDataPath);

    // Connect to orchestrator
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      console.log(chalk.green('✓ Connected to orchestrator'));

      const helloMessage = createEnvelope('agent.hello', {
        payload: {
          agentDeviceId,
          serverId,
          agentVersion: '0.1.0',
          platform: process.platform === 'win32' ? 'windows' : 'linux',
          capabilities: [
            'fs.read',
            'fs.list',
            'fs.write',
            'fs.applyPatch',
            'git.checkpoint',
            'git.rollback',
            'fivem.restartResource',
            'fivem.restartServer',
            'fivem.tailConsole',
            'scan.resources',
          ],
        },
      });

      ws.send(JSON.stringify(helloMessage));
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'agent.request') {
          const request = message.payload as AgentRequest;
          const response = await handleRequest(request, fsActions, gitActions, fivemActions, scanner);
          ws.send(JSON.stringify(createResponse(message.requestId, 'agent.response', response)));
        }
      } catch (error) {
        console.error(chalk.red('Failed to handle message:'), error);
      }
    });

    ws.on('close', () => {
      console.log(chalk.yellow('Disconnected from orchestrator'));
      process.exit(0);
    });

    ws.on('error', (error) => {
      console.error(chalk.red('WebSocket error:'), error);
      process.exit(1);
    });

    // Send heartbeats
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(createEnvelope('agent.heartbeat', {
          payload: {
            uptimeSeconds: 0,
            activeFxServer: true,
            playerCount: 0,
            fps: 0,
          },
        })));
      }
    }, 30000);
  });

async function handleRequest(
  request: AgentRequest,
  fsActions: FilesystemActions,
  gitActions: GitActions,
  fivemActions: FiveMActions,
  scanner: Scanner
): Promise<AgentResponse> {
  try {
    let result: any;

    switch (request.action) {
      case 'fs.read': {
        const args = request.args as { path: string; maxBytes?: number };
        result = await fsActions.readFile(args.path, args.maxBytes);
        break;
      }

      case 'fs.list': {
        const args = request.args as { path: string; recursive?: boolean };
        result = await fsActions.listDirectory(args.path, args.recursive);
        break;
      }

      case 'fs.applyPatch': {
        const args = request.args as { changeId: string; files: Array<{ path: string; expectedSha256?: string; newContent: string }> };
        result = await fsActions.applyPatch(args.changeId, args.files);
        break;
      }

      case 'git.checkpoint': {
        const args = request.args as { changeId: string; message?: string };
        result = await gitActions.checkpoint(args.changeId, args.message);
        break;
      }

      case 'git.rollback': {
        const args = request.args as { sha: string };
        result = await gitActions.rollback(args.sha);
        break;
      }

      case 'fivem.restartResource': {
        const args = request.args as { resourceName: string };
        result = await fivemActions.restartResource(args.resourceName);
        break;
      }

      case 'fivem.tailConsole': {
        const args = request.args as { durationMs?: number; maxLines?: number };
        result = await fivemActions.tailConsole(args.durationMs, args.maxLines);
        break;
      }

      case 'scan.resources':
        result = await scanner.scanAll();
        break;

      case 'fs.write': {
        const args = request.args as { path: string; content: string };
        result = await fsActions.writeFile(args.path, args.content);
        break;
      }

      case 'fivem.restartServer': {
        result = await fivemActions.restartServer();
        break;
      }

      default:
        return {
          ok: false,
          action: request.action,
          error: createError(ErrorCodes.ACTION_UNKNOWN, `Unknown action: ${request.action}`),
        };
    }

    return {
      ok: true,
      action: request.action,
      result,
    };
  } catch (error: any) {
    return {
      ok: false,
      action: request.action,
      error: createError(
        ErrorCodes.ACTION_FAILED,
        error.message || 'Action failed',
        { retryable: false }
      ),
    };
  }
}

program.parse();
