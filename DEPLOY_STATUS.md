# Deployed Services
# Last updated: 2026-08-18

## Live OmniRoute Tunnel
# Run: cloudflared tunnel --url http://localhost:20128
# Note: URL changes on each restart (quick tunnel)
OMNI_TUNNEL_URL=https://undergraduate-surprise-cameras-fighting.trycloudflare.com

## Services to Deploy

### Orchestrator (Railway)
# Repo: https://github.com/AbdallahAlAsmar/nox-fivem
# Service: apps/orchestrator
# Railway URL: [TBD - after deploy]
RAILWAY_ORCH_URL=https://[REDACTED]

### Web Dashboard (Vercel)
# Root Directory: apps/web
# Vercel URL: [TBD - after deploy]
VERCEL_URL=https://[REDACTED]

## Environment Variables Needed

### Railway (Orchestrator)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=<generate-random-32-chars>
CLERK_JWKS_DOMAIN=relevant-ram-9120.clerk.accounts.dev
CORS_ORIGINS=https://[REDACTED],http://localhost:3000,http://localhost:1420
OMNIROUTE_BASE_URL=https://ought-lambda-makes-photograph.trycloudflare.com/v1
OMNI_KEY=omni-key
NODE_ENV=production

### Vercel (Web)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_ORCHESTRATOR_URL=https://[REDACTED]

### Tauri (Desktop App)
VITE_ORCHESTRATOR_URL=https://[REDACTED]
