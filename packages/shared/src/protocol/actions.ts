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
// Server Create / Auto-Pair
// ============================================

/**
 * Response of POST /api/servers. Auto-pairs an agent device at creation time;
 * `connect.sessionToken` carries the same one-time session token shape that
 * pairing claim mints, so auto-paired devices can present a token at hello and
 * AGENT_LEGACY_OK can be flipped off. Optional so older clients that predate
 * token minting keep validating.
 */
export const ServerCreateResponseSchema = z.object({
  server: z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
  }),
  connect: z.object({
    serverId: z.string(),
    agentDeviceId: z.string(),
    wsUrl: z.string().url(),
    sessionToken: z.string().optional(),
  }),
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
  // Session token issued at pairing-claim time. Optional for transitional
  // backwards compatibility (see AGENT_LEGACY_OK in the orchestrator gateway).
  sessionToken: z.string().optional(),
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
  // Change.id is minted by Prisma as a cuid (@default(cuid()) on the Change
  // model), while some clients/fixtures mint UUIDs. changeId is an opaque
  // correlation token the agent merely echoes back — it carries no security
  // property — so accept ANY non-empty string rather than pinning a single
  // id format that real production payloads would fail validation on.
  changeId: z.string().min(1),
  files: z.array(z.object({
    path: z.string(),
    expectedSha256: z.string().optional(),
    newContent: z.string(),
  })),
});

export const FsApplyPatchResultSchema = z.object({
  changeId: z.string().min(1),
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
  // Change.id is minted by Prisma as a cuid (@default(cuid()) on the Change
  // model), while some clients/fixtures mint UUIDs. changeId is an opaque
  // correlation token the agent merely echoes back — it carries no security
  // property — so accept ANY non-empty string rather than pinning a single
  // id format that real production payloads would fail validation on.
  // (Same rationale as FsApplyPatchArgsSchema/FsApplyPatchResultSchema.)
  changeId: z.string().min(1),
  message: z.string().optional(),
});

export const GitCheckpointResultSchema = z.object({
  changeId: z.string().min(1),
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

// Optional per-server txAdmin connection details. The orchestrator relays
// these from Server.settings so agents don't need their own config store;
// every field is optional so agents without txAdmin keep working (they reply
// NOT_IMPLEMENTED / source:'none' honestly).
export const TxAdminConfigSchema = z.object({
  useTxAdmin: z.boolean().optional(),
  txadminUrl: z.string().optional(),
  txadminApiKey: z.string().optional(),
});

export const ListPlayersArgsSchema = TxAdminConfigSchema;

export const BanPlayerArgsSchema = TxAdminConfigSchema.extend({
  identifier: z.string(),
  reason: z.string().optional(),
});

export const UnbanPlayerArgsSchema = TxAdminConfigSchema.extend({
  identifier: z.string(),
});

export const RestartResourceArgsSchema = TxAdminConfigSchema.extend({
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
export type ServerCreateResponse = z.infer<typeof ServerCreateResponseSchema>;
export type AgentHello = z.infer<typeof AgentHelloSchema>;
export type AgentAuthenticated = z.infer<typeof AgentAuthenticatedSchema>;
export type TxAdminConfig = z.infer<typeof TxAdminConfigSchema>;
export type ListPlayersArgs = z.infer<typeof ListPlayersArgsSchema>;
export type BanPlayerArgs = z.infer<typeof BanPlayerArgsSchema>;
export type UnbanPlayerArgs = z.infer<typeof UnbanPlayerArgsSchema>;
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
