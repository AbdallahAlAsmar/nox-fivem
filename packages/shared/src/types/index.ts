// Core domain types for FiveM AI Developer

// ============================================
// User & Organization
// ============================================

export interface User {
  id: string;
  orgId: string;
  email: string;
  role: 'owner' | 'admin' | 'developer' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  stripeCustomerId?: string;
  planTier: 'starter' | 'growth' | 'pro';
  monthlyActionLimit: number;
  monthlyCostCapUsd: number;
  conversationCostCapUsd: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Server & Agent
// ============================================

export type Framework = 'qbcore' | 'vrp' | 'esx' | 'unknown';
export type ServerStatus = 'unpaired' | 'online' | 'offline' | 'paused' | 'error';
export type AgentStatus = 'pending' | 'paired' | 'revoked' | 'paused';
export type Platform = 'windows' | 'linux' | 'unknown';

export interface Server {
  id: string;
  orgId: string;
  name: string;
  framework: Framework;
  status: ServerStatus;
  rootLabel?: string;
  lastSeenAt?: Date;
  lastScanAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentDevice {
  id: string;
  serverId: string;
  name?: string;
  pairingTokenHash?: string;
  publicKey?: string;
  agentVersion?: string;
  platform: Platform;
  status: AgentStatus;
  lastHeartbeatAt?: Date;
  lastIp?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Resource Index
// ============================================

export interface ResourceIndex {
  id: string;
  serverId: string;
  resourceName: string;
  relativePath: string;
  manifestPath?: string;
  manifestHash?: string;
  dependencies: string[];
  provides: string[];
  files: string[];
  metadata: Record<string, unknown>;
  lastScannedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Chat
// ============================================

export type ThreadStatus = 'open' | 'archived';

export interface ChatThread {
  id: string;
  serverId: string;
  userId: string;
  title?: string;
  status: ThreadStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessage {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  toolCalls: ToolCall[];
  model?: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  createdAt: Date;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

// ============================================
// Changes
// ============================================

export type ChangeStatus = 
  | 'pending'
  | 'cancelled'
  | 'approved'
  | 'applying'
  | 'applied'
  | 'failed'
  | 'rolled_back';

export interface FileChange {
  path: string;
  oldContent?: string;
  newContent: string;
  oldHash?: string;
  newHash: string;
}

export interface Change {
  id: string;
  serverId: string;
  threadId?: string;
  createdByUserId?: string;
  approvedByUserId?: string;
  filesTouched: string[];
  diff: string;
  status: ChangeStatus;
  gitCheckpointSha?: string;
  gitCommitSha?: string;
  applyResult?: Record<string, unknown>;
  rollbackResult?: Record<string, unknown>;
  createdAt: Date;
  approvedAt?: Date;
  appliedAt?: Date;
  rolledBackAt?: Date;
  updatedAt: Date;
}

// ============================================
// Audit Log
// ============================================

export type ActorType = 'user' | 'system' | 'agent' | 'model';

export interface AuditLog {
  id: string;
  orgId: string;
  serverId?: string;
  actorUserId?: string;
  actorType: ActorType;
  action: string;
  requestId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// ============================================
// Usage
// ============================================

export type EventType = 'chat' | 'tool_call' | 'scan' | 'fix' | 'retry';

export interface UsageEvent {
  id: string;
  orgId: string;
  serverId?: string;
  threadId?: string;
  messageId?: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  eventType: EventType;
  createdAt: Date;
}
