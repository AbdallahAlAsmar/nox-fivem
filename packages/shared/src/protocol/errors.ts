import { z } from 'zod';

// Error codes for the protocol
export const ErrorCodes = {
  // Authentication/Authorization
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // Agent errors
  AGENT_NOT_CONNECTED: 'AGENT_NOT_CONNECTED',
  AGENT_OFFLINE: 'AGENT_OFFLINE',
  AGENT_BUSY: 'AGENT_BUSY',
  
  // Filesystem errors
  PATH_OUTSIDE_ROOT: 'PATH_OUTSIDE_ROOT',
  PATH_NOT_FOUND: 'PATH_NOT_FOUND',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // Action errors
  ACTION_NOT_ALLOWED: 'ACTION_NOT_ALLOWED',
  ACTION_UNKNOWN: 'ACTION_UNKNOWN',
  ACTION_TIMEOUT: 'ACTION_TIMEOUT',
  ACTION_FAILED: 'ACTION_FAILED',
  
  // Git errors
  NOT_A_GIT_REPO: 'NOT_A_GIT_REPO',
  GIT_CHECKPOINT_FAILED: 'GIT_CHECKPOINT_FAILED',
  GIT_ROLLBACK_FAILED: 'GIT_ROLLBACK_FAILED',
  NO_CHECKPOINT_TO_ROLLBACK: 'NO_CHECKPOINT_TO_ROLLBACK',
  
  // FiveM errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_RESTART_FAILED: 'RESOURCE_RESTART_FAILED',
  TXADMIN_NOT_DETECTED: 'TXADMIN_NOT_DETECTED',
  
  // Change errors
  CHANGE_NOT_PENDING: 'CHANGE_NOT_PENDING',
  CHANGE_ALREADY_APPLIED: 'CHANGE_ALREADY_APPLIED',
  FILE_CHANGED_SINCE_STAGED: 'FILE_CHANGED_SINCE_STAGED',
  
  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  RATE_LIMITED: 'RATE_LIMITED',
  COST_CAP_EXCEEDED: 'COST_CAP_EXCEEDED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Error response schema
export const AgentErrorSchema = z.object({
  code: z.string() as z.ZodType<ErrorCode>,
  message: z.string(),
  retryable: z.boolean().default(false),
  details: z.record(z.unknown()).optional(),
});

export type AgentError = z.infer<typeof AgentErrorSchema>;

// Helper to create an error
export function createError(
  code: ErrorCode,
  message: string,
  options: {
    retryable?: boolean;
    details?: Record<string, unknown>;
  } = {}
): AgentError {
  return {
    code,
    message,
    retryable: options.retryable ?? false,
    details: options.details,
  };
}

// Check if error is retryable
export function isRetryable(error: AgentError): boolean {
  return error.retryable;
}
