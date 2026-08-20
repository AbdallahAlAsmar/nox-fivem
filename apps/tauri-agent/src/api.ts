// Desktop app API — talks directly to the orchestrator HTTP API
// Uses Clerk session token for auth when available

// The orchestrator runs on VPS (Oracle 158.101.167.118:3001)
// Override at build time with VITE_ORCHESTRATOR_URL env var
const ORCHESTRATOR_URL = import.meta.env?.VITE_ORCHESTRATOR_URL
  || 'http://158.101.167.118:3001'