/** Base orchestrator URL — override with NEXT_PUBLIC_ORCHESTRATOR_URL env var.
 *  On Vercel, point at the proxy so the browser stays on HTTPS. */
export const ORCHESTRATOR_URL =
  process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ||
  (process.env.VERCEL ? '/api/orchestrator' : 'http://158.101.167.118:3001');
