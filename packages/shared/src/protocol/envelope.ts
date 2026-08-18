import { z } from 'zod';

// Protocol version for compatibility checking
export const PROTOCOL_VERSION = '2026-08-12.v1' as const;

// Base envelope schema for all messages
export const AgentMessageEnvelopeSchema = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  messageId: z.string().uuid(),
  type: z.string(),
  sentAt: z.string().datetime(),
  serverId: z.string().uuid().optional(),
  agentDeviceId: z.string().uuid().optional(),
  requestId: z.string().uuid().optional(),
  payload: z.unknown().optional(),
});

export type AgentMessageEnvelope = z.infer<typeof AgentMessageEnvelopeSchema>;

// Helper to create a message envelope
export function createEnvelope(
  type: string,
  options: {
    messageId?: string;
    serverId?: string;
    agentDeviceId?: string;
    requestId?: string;
    payload?: unknown;
  } = {}
): AgentMessageEnvelope {
  return {
    protocolVersion: PROTOCOL_VERSION,
    messageId: options.messageId ?? crypto.randomUUID(),
    type,
    sentAt: new Date().toISOString(),
    serverId: options.serverId,
    agentDeviceId: options.agentDeviceId,
    requestId: options.requestId,
    payload: options.payload,
  };
}

// Helper to create a response envelope (echoes requestId)
export function createResponse(
  requestId: string,
  type: string,
  payload: unknown,
  options: {
    serverId?: string;
    agentDeviceId?: string;
  } = {}
): AgentMessageEnvelope {
  return createEnvelope(type, {
    requestId,
    serverId: options.serverId,
    agentDeviceId: options.agentDeviceId,
    payload,
  });
}
