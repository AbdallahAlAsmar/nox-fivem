/** Base orchestrator URL — use Vercel API route in production, direct tunnel in dev */
export const ORCHESTRATOR_URL =
  process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || '/api/orchestrator';