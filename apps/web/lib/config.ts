/** Base orchestrator URL — override with NEXT_PUBLIC_ORCHESTRATOR_URL env var */
export const ORCHESTRATOR_URL =
  process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:3001';
