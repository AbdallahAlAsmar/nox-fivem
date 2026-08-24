import { describe, it, expect } from 'vitest';
import {
  createEnvelope,
  createResponse,
  AgentMessageEnvelopeSchema,
  AgentRequestSchema,
  AgentResponseSchema,
  FsReadResultSchema,
  FsListResultSchema,
  FsApplyPatchArgsSchema,
  FsApplyPatchResultSchema,
  ScanResourcesResultSchema,
  RestartResourceArgsSchema,
  RestartResourceResultSchema,
  PROTOCOL_VERSION,
} from './src/protocol/index';
import { ErrorCodes, createError } from './src/protocol/errors';

describe('Protocol Envelope', () => {
  it('should create a valid envelope', () => {
    const envelope = createEnvelope('agent.hello', {
      serverId: 'test-server-id',
      payload: { agentDeviceId: 'device-1' },
    });

    expect(envelope.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(envelope.type).toBe('agent.hello');
    expect(envelope.serverId).toBe('test-server-id');
    expect(typeof envelope.messageId).toBe('string');
    expect(envelope.sentAt).toBeDefined();
  });

  it('should create a valid response envelope', () => {
    const response = createResponse('req-123', 'agent.response', { ok: true });

    expect(response.requestId).toBe('req-123');
    expect(response.type).toBe('agent.response');
    expect(response.payload).toEqual({ ok: true });
  });

  it('should validate a complete envelope', () => {
    const envelope = createEnvelope('agent.request', {
      serverId: '123e4567-e89b-12d3-a456-426614174000',
      requestId: '123e4567-e89b-12d3-a456-426614174001',
      payload: { action: 'fs.read', args: { path: 'test.lua' } },
    });

    const result = AgentMessageEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(true);
  });
});

describe('Error Codes', () => {
  it('should create an error', () => {
    const error = createError(ErrorCodes.PATH_OUTSIDE_ROOT, 'Path is outside root');
    expect(error.code).toBe(ErrorCodes.PATH_OUTSIDE_ROOT);
    expect(error.message).toBe('Path is outside root');
    expect(error.retryable).toBe(false);
  });

  it('should create a retryable error', () => {
    const error = createError(
      ErrorCodes.ACTION_FAILED,
      'Action failed',
      { retryable: true, details: { reason: 'timeout' } }
    );
    expect(error.retryable).toBe(true);
    expect(error.details).toEqual({ reason: 'timeout' });
  });
});

describe('Agent Request/Response', () => {
  it('should validate a request', () => {
    const request = {
      action: 'fs.read',
      args: { path: 'test.lua', maxBytes: 100000 },
      timeout: 30000,
    };

    const result = AgentRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it('should validate a successful response', () => {
    const response = {
      ok: true as const,
      action: 'fs.read',
      result: { path: 'test.lua', content: 'hello' },
    };

    const result = AgentResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should validate an error response', () => {
    const response = {
      ok: false as const,
      action: 'fs.read',
      error: {
        code: 'PATH_OUTSIDE_ROOT',
        message: 'Path is outside root',
        retryable: false,
      },
    };

    const result = AgentResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe('Envelope Validation', () => {
  it('should validate a complete envelope with UUIDs', () => {
    const envelope = createEnvelope('agent.request', {
      serverId: '123e4567-e89b-12d3-a456-426614174000',
      requestId: '123e4567-e89b-12d3-a456-426614174001',
      payload: { action: 'fs.read', args: { path: 'test.lua' } },
    });

    const result = AgentMessageEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Rust (Tauri agent) payload fixtures. These assert that the shapes the
// desktop agent actually emits over the wire parse against the schemas — the
// contract between apps/tauri-agent and the orchestrator.
// ---------------------------------------------------------------------------

describe('Rust agent payload fixtures', () => {
  it('parses a Tauri fs.read result with sha256 + modifiedAt', () => {
    // Mirrors send_result() in apps/tauri-agent/src-tauri/src/commands/agent.rs
    const rustReply = {
      content: 'fx_version \'cerulean\'\n',
      path: 'resources/my-res/fxmanifest.lua',
      sha256: 'a'.repeat(64),
      size: 22,
      modifiedAt: '2026-08-24T12:00:00.000Z',
    };
    const result = FsReadResultSchema.safeParse(rustReply);
    expect(result.success).toBe(true);
  });

  it('parses a Tauri fs.list result with typed entries', () => {
    const rustReply = {
      path: 'resources',
      entries: [
        { name: 'my-res', path: 'resources/my-res', type: 'directory' },
        { name: 'fxmanifest.lua', path: 'resources/my-res/fxmanifest.lua', type: 'file', size: 1024, modifiedAt: '2026-08-24T12:00:00.000Z' },
      ],
    };
    const result = FsListResultSchema.safeParse(rustReply);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entries[0].type).toBe('directory');
      expect(result.data.entries[1].type).toBe('file');
    }
  });

  it('parses Tauri fs.applyPatch args and its success reply', () => {
    const args = {
      changeId: '123e4567-e89b-42d3-a456-426614174000',
      files: [
        { path: 'resources/my-res/fxmanifest.lua', expectedSha256: 'b'.repeat(64), newContent: 'fx_version \'cerulean\'\n' },
        { path: 'resources/new-res/server/main.lua', newContent: 'print("hi")\n' },
      ],
    };
    expect(FsApplyPatchArgsSchema.safeParse(args).success).toBe(true);

    const reply = {
      changeId: '123e4567-e89b-42d3-a456-426614174000',
      appliedFiles: [
        { path: 'resources/my-res/fxmanifest.lua', success: true },
        { path: 'resources/new-res/server/main.lua', success: true },
      ],
      allSucceeded: true,
    };
    expect(FsApplyPatchResultSchema.safeParse(reply).success).toBe(true);
  });

  it('parses a Tauri scan.resources result (camelCase keys, lowercase framework, ISO8601 scannedAt)', () => {
    // Must stay in lockstep with scanner.rs serde renames.
    const rustScan = {
      framework: 'qbcore',
      resources: [
        {
          name: 'qb-core',
          relativePath: 'resources/[qbx]/qb-core',
          manifestPath: 'resources/[qbx]/qb-core/fxmanifest.lua',
          dependencies: ['ox_lib'],
          provides: [],
          files: ['client.lua', 'server.lua'],
        },
        {
          name: 'standalone-hud',
          relativePath: 'resources/[cats]/standalone-hud',
          manifestPath: 'resources/[cats]/standalone-hud/__resource.lua',
          dependencies: [],
          provides: ['hud'],
          files: [],
        },
      ],
      scannedAt: '2026-08-24T13:51:07.123Z',
    };
    const result = ScanResourcesResultSchema.safeParse(rustScan);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.framework).toBe('qbcore');
      expect(result.data.scannedAt).toBe('2026-08-24T13:51:07.123Z');
    }
  });

  it('rejects legacy snake_case scan results so drift is caught by tests', () => {
    const legacyScan = {
      framework: 'QBCore', // uppercase value is not in the enum
      resources: [
        {
          name: 'qb-core',
          relative_path: 'resources/qb-core',
          manifest_path: 'resources/qb-core/fxmanifest.lua',
        },
      ],
      scanned_at: 1724497867, // epoch int, not ISO8601
    };
    expect(ScanResourcesResultSchema.safeParse(legacyScan).success).toBe(false);
  });

  it('parses fivem.restartResource args/result round-trip', () => {
    const args = { resourceName: 'my-res' };
    expect(RestartResourceArgsSchema.safeParse(args).success).toBe(true);

    const okResult = { resourceName: 'my-res', success: true };
    expect(RestartResourceResultSchema.safeParse(okResult).success).toBe(true);

    const failedResult = { resourceName: 'my-res', success: false, error: 'txAdmin not configured' };
    expect(RestartResourceResultSchema.safeParse(failedResult).success).toBe(true);
  });
});
