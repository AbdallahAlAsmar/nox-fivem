import { describe, it, expect } from 'vitest';
import {
  createEnvelope,
  createResponse,
  AgentMessageEnvelopeSchema,
  AgentRequestSchema,
  AgentResponseSchema,
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
