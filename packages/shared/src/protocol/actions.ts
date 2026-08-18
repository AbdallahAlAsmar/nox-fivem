import { z } from 'zod';

// ============================================
// Pairing Actions
// ============================================

export const PairingClaimSchema = z.object({
  pairingCode: z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/),
  agentVersion: z.string(),
  platform: z.enum(['windows', 'linux', 'unknown']),
  rootLabel: z.string(),
});

export const PairingClaimResponseSchema = z.object({
  serverId: z.string().uuid(),
  agentDeviceId: z.string().uuid(),
  sessionToken: z.string(),
  wsUrl: z.string().url(),
});

// ============================================
// Agent Hello/Auth
// ============================================

export const AgentHelloSchema = z.object({
  agentDeviceId: z.string().uuid(),
  serverId: z.string().uuid(),
  agentVersion: z.string(),
  platform: z.enum(['windows', 'linux', 'unknown']),
  publicKey: z.string().optional(),
  capabilities: z.array(z.string()),
});

export const AgentAuthenticatedSchema = z.object({
  serverTime: z.string().datetime(),
  heartbeatIntervalMs: z.number().int().positive().default(30000),
  minimumAgentVersion: z.string().optional(),
});

// ============================================
// Filesystem Actions
// ============================================

export const FsListArgsSchema = z.object({
  path: z.string(),
  recursive: z.boolean().optional().default(false),
  maxEntries: z.number().int().positive().optional().default(1000),
});

export const FsListResultSchema = z.object({
  path: z.string(),
  entries: z.array(z.object({
    name: z.string(),
    path: z.string(),
    type: z.enum(['file', 'directory']),
    size: z.number().int().nonnegative().optional(),
    modifiedAt: z.string().datetime().optional(),
  })),
  truncated: z.boolean().optional(),
});

export const FsReadArgsSchema = z.object({
  path: z.string(),
  maxBytes: z.number().int().positive().optional().default(200000),
});

export const FsReadResultSchema = z.object({
  path: z.string(),
  content: z.string(),
  sha256: z.string(),
  size: z.number().int().nonnegative(),
  modifiedAt: z.string().datetime(),
  truncated: z.boolean().optional(),
});

export const FsApplyPatchArgsSchema = z.object({
  changeId: z.string().uuid(),
  files: z.array(z.object({
    path: z.string(),
    expectedSha256: z.string().optional(),
    newContent: z.string(),
  })),
});

export const FsApplyPatchResultSchema = z.object({
  changeId: z.string().uuid(),
  appliedFiles: z.array(z.object({
    path: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  })),
  allSucceeded: z.boolean(),
});

// ============================================
// Git Actions
// ============================================

export const GitStatusResultSchema = z.object({
  isRepo: z.boolean(),
  branch: z.string().optional(),
  clean: z.boolean().optional(),
  ahead: z.number().int().nonnegative().optional(),
  behind: z.number().int().nonnegative().optional(),
});

export const GitCheckpointArgsSchema = z.object({
  changeId: z.string().uuid(),
  message: z.string().optional(),
});

export const GitCheckpointResultSchema = z.object({
  changeId: z.string().uuid(),
  sha: z.string(),
  branch: z.string(),
});

export const GitRollbackArgsSchema = z.object({
  sha: z.string(),
  restartResources: z.array(z.string()).optional(),
});

export const GitRollbackResultSchema = z.object({
  sha: z.string(),
  rolledBackFiles: z.array(z.string()),
  success: z.boolean(),
});

// ============================================
// Scanner Actions
// ============================================

export const ScanResourcesResultSchema = z.object({
  framework: z.enum(['qbcore', 'vrp', 'esx', 'unknown']),
  resources: z.array(z.object({
    name: z.string(),
    relativePath: z.string(),
    manifestPath: z.string(),
    dependencies: z.array(z.string()),
    provides: z.array(z.string()),
    files: z.array(z.string()),
  })),
  scannedAt: z.string().datetime(),
});

// ============================================
// FiveM/txAdmin Actions
// ============================================

export const RestartResourceArgsSchema = z.object({
  resourceName: z.string(),
  timeout: z.number().int().positive().optional().default(30000),
});

export const RestartResourceResultSchema = z.object({
  resourceName: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
});

export const TailConsoleArgsSchema = z.object({
  durationMs: z.number().int().positive().optional().default(5000),
  maxLines: z.number().int().positive().optional().default(100),
});

export const TailConsoleResultSchema = z.object({
  lines: z.array(z.object({
    timestamp: z.string().datetime(),
    level: z.enum(['info', 'warn', 'error', 'debug']).optional(),
    message: z.string(),
    resource: z.string().optional(),
  })),
  truncated: z.boolean().optional(),
});

// ============================================
// Heartbeat
// ============================================

export const HeartbeatPayloadSchema = z.object({
  uptimeSeconds: z.number().int().nonnegative(),
  currentRootHash: z.string().optional(),
  activeFxServer: z.boolean().optional(),
  playerCount: z.number().int().nonnegative().optional(),
  fps: z.number().int().nonnegative().optional(),
});

// ============================================
// Request/Response Wrappers
// ============================================

export const AgentRequestSchema = z.object({
  action: z.string(),
  args: z.record(z.unknown()),
  timeout: z.number().int().positive().optional(),
});

export const AgentSuccessResponseSchema = z.object({
  ok: z.literal(true),
  action: z.string(),
  result: z.unknown(),
});

export const AgentErrorResponseSchema = z.object({
  ok: z.literal(false),
  action: z.string(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
    details: z.record(z.unknown()).optional(),
  }),
});

export const AgentResponseSchema = z.discriminatedUnion('ok', [
  AgentSuccessResponseSchema,
  AgentErrorResponseSchema,
]);

// Type exports
export type PairingClaim = z.infer<typeof PairingClaimSchema>;
export type PairingClaimResponse = z.infer<typeof PairingClaimResponseSchema>;
export type AgentHello = z.infer<typeof AgentHelloSchema>;
export type AgentAuthenticated = z.infer<typeof AgentAuthenticatedSchema>;
export type FsListArgs = z.infer<typeof FsListArgsSchema>;
export type FsListResult = z.infer<typeof FsListResultSchema>;
export type FsReadArgs = z.infer<typeof FsReadArgsSchema>;
export type FsReadResult = z.infer<typeof FsReadResultSchema>;
export type FsApplyPatchArgs = z.infer<typeof FsApplyPatchArgsSchema>;
export type FsApplyPatchResult = z.infer<typeof FsApplyPatchResultSchema>;
export type GitStatusResult = z.infer<typeof GitStatusResultSchema>;
export type GitCheckpointArgs = z.infer<typeof GitCheckpointArgsSchema>;
export type GitCheckpointResult = z.infer<typeof GitCheckpointResultSchema>;
export type GitRollbackArgs = z.infer<typeof GitRollbackArgsSchema>;
export type GitRollbackResult = z.infer<typeof GitRollbackResultSchema>;
export type ScanResourcesResult = z.infer<typeof ScanResourcesResultSchema>;
export type RestartResourceArgs = z.infer<typeof RestartResourceArgsSchema>;
export type RestartResourceResult = z.infer<typeof RestartResourceResultSchema>;
export type TailConsoleArgs = z.infer<typeof TailConsoleArgsSchema>;
export type TailConsoleResult = z.infer<typeof TailConsoleResultSchema>;
export type HeartbeatPayload = z.infer<typeof HeartbeatPayloadSchema>;
export type AgentRequest = z.infer<typeof AgentRequestSchema>;
export type AgentSuccessResponse = z.infer<typeof AgentSuccessResponseSchema>;
export type AgentErrorResponse = z.infer<typeof AgentErrorResponseSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
