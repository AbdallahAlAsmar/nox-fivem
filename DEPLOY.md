# NOX // FiveM — Deployment Guide
**Date**: 2026-08-18 | **Author**: AbdallahAlAsmar

## Architecture

```
                  ┌──────────────┐
                  │   Vercel     │  ←  https://nox.fivem.app (web dashboard)
                  │  (Next.js)   │     ← NEXT_PUBLIC_ORCHESTRATOR_URL → orchestrator
                  └──────┬───────┘
                         │  (HTTP API)
                         ▼
                  ┌──────────────┐
                  │   Railway    │  ←  Always-on Fastify + WebSocket
                  │ (Orchestrator)│
                  └──────┬───────┘
                         │
                         ▼
         ┌───────────────────────────────────┐
         │  Cloudflare Quick Tunnel          │
         │  https://undergraduate-surprise-cameras-fighting.trycloudflare.com
         │  → proxy → localhost:20128        │
         └───────────────────────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  OmniRoute   │  ←  localhost:20128 (your PC, 643 models)
                  └──────────────┘
                         │
                  ┌──────┴───────┐
                  │  Railway DB  │  ← PostgreSQL (Neon or Railway managed)
                  └──────────────┘
```

**Two things stay on your machine**: OmniRoute (`:20128`) and the FiveM servers themselves.
Everything else is hosted.

---

## Pre-requisites Checklist

| Item | Status | How to get it |
|------|--------|---------------|
| GitHub account | ✅ | Logged in as `AbdallahAlAsmar` |
| GitHub CLI (`gh`) | ✅ | `gh auth status` shows active |
| Cloudflare Tunnel | ✅ | Tunnel running → `https://undergraduate-surprise-cameras-fighting.trycloudflare.com` |
| OmniRoute running | ✅ | `localhost:20128` responds (643 models) |
| Railway account | ❌ | Sign up at https://railway.app |
| Vercel account | ❌ | Sign up at https://vercel.com |
| Clerk Dashboard | ✅ | `relevant-ram-9120.clerk.accounts.dev` |
| Fresh GitHub repo | ❌ | Create `nox-fivem` (private) — no existing repo |
| Neon / Railway Postgres | ❌ | Create a free Neon project |

---

## STEP 1 — Create the GitHub repo

```bash
cd D:/fivem-dev
gh repo create nox-fivem --private --source=. --push
```

This creates `https://github.com/AbdallahAlAsmar/nox-fivem` and pushes your entire codebase.

---

## STEP 2 — Create the Postgres database (Neon — free tier)

1. Go to https://neon.tech → Sign up → Create Project → `nox-fivem`
2. Copy the connection string: `postgresql://<user>:<pass>@ep-xxx.region-1.aws.neon.tech/fivem_dev?sslmode=require`
3. You'll need both:
   - `DATABASE_URL` (above, with `?sslmode=require`)
   - `DIRECT_URL` (same, or the direct connection string from Neon dashboard)

**Alternatively: Railway Postgres** (easier, same account):
- Railway → New → PostgreSQL → name it `fivem-dev` → note the connection URL

---

## STEP 3 — Deploy the orchestrator to Railway

1. Go to https://railway.app → New → GitHub Repo → Select `AbdallahAlAsmar/nox-fivem`
2. Select `apps/orchestrator` as the service directory
3. Railway will detect `railway.toml` automatically — use the Railway Dockerfile

**Set these environment variables in Railway:**

| Variable | Value | Where to get it |
|----------|-------|-----------------|
| `DATABASE_URL` | `postgresql://...` | Neon or Railway Postgres (with `?sslmode=require`) |
| `DIRECT_URL` | Same as DATABASE_URL | Neon or Railway Postgres |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | Run locally, copy output |
| `CLERK_JWKS_DOMAIN` | `relevant-ram-9120.clerk.accounts.dev` | Clerk Dashboard → API Keys |
| `CORS_ORIGINS` | `https://your-app.vercel.app,http://localhost:3000,http://localhost:1420` | Your Vercel URL (add after Step 4) |
| `OMNIROUTE_BASE_URL` | `https://undergraduate-surprise-cameras-fighting.trycloudflare.com/v1` | This is your live tunnel URL |
| `OMNI_KEY` | `omni-key` | Default in your .env |
| `ANTHROPIC_API_KEY` | *(leave empty)* | Not using Anthropic |
| `NODE_ENV` | `production` | |
| `ORCHESTRATOR_PORT` | `8080` | Railway sets this automatically |

4. **Connect your Neon/Railway Postgres** (if using Railway managed DB):
   - Railway → Settings → Databases → Connect Neon → Paste connection string

5. Deploy → Railway will build the Docker image (with `tsx`, Prisma generate) and start.

6. After deploy, copy your orchestrator URL (e.g. `https://nox-orchestrator-12345.up.railway.app`)

---

## STEP 4 — Deploy the web to Vercel

1. Go to https://vercel.com → New Project → Import `AbdallahAlAsmar/nox-fivem`
2. **Root Directory**: `apps/web`  ← critical
3. Framework Preset: **Next.js** (auto-detected)
4. **Environment Variables** (set in Vercel dashboard):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Your Clerk pk_test key |
| `CLERK_SECRET_KEY` | Your Clerk sk_test key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/dashboard` |
| `NEXT_PUBLIC_ORCHESTRATOR_URL` | `https://nox-orchestrator-12345.up.railway.app` |

5. Deploy → Get your Vercel URL (e.g. `https://nox-five-m.vercel.app`)

6. **Update CORS** on Railway: add your Vercel URL to `CORS_ORIGINS`:
   ```
   https://nox-five-m.vercel.app,http://localhost:3000,http://localhost:1420
   ```

---

## STEP 5 — Tauri Desktop App

The Tauri app reads `VITE_ORCHESTRATOR_URL` at build time. Two options:

**A. Hardcode the orchestrator URL in `src-tauri/tauri.conf.json` (quick):**
Not ideal — need to rebuild whenever orchestrator URL changes.

**B. Use a `.env` file in the Tauri app root (recommended):**
Create `apps/tauri-agent/.env`:
```
VITE_ORCHESTRATOR_URL=https://nox-orchestrator-12345.up.railway.app
```
Then rebuild: `cd apps/tauri-agent && pnpm tauri build`

**C. Dynamic config at runtime (no rebuild needed):**
Update `src/contexts/ClerkContext.tsx` / `src/api.ts` to read from a remote config endpoint. More work, future-proof.

---

## STEP 6 — Final verification checklist

- [ ] `https://your-app.vercel.app` loads (Clerk login works)
- [ ] Sign in → Dashboard loads, no CORS errors in browser console
- [ ] Adding a server works (creates in Postgres)
- [ ] Chatting with AI works (orchestrator → tunnel → OmniRoute)
- [ ] WebSocket connections from agents work (`/ws/agent`)
- [ ] Changes tab shows pending diffs
- [ ] Players page loads (fetches from orchestrator API)

---

## Tunnel maintenance

Your Cloudflare tunnel (`cloudflared tunnel --url http://localhost:20128`) runs on your machine.
When you restart your PC, you need to start it again:

```bash
cloudflared tunnel --url http://localhost:20128
```

The URL will change each time you create a new quick tunnel.
When you get a new URL, update `OMNIROUTE_BASE_URL` in Railway:
```
https://<new-random>.trycloudflare.com/v1
```

**For production** (stable URL), set up a named Cloudflare tunnel with a custom domain:
1. `cloudflared tunnel create nox-omni`
2. `cloudflared tunnel route dns nox-omni <your-domain>`
3. `cloudflared tunnel run nox-omni`

---

## Troubleshooting

**"Authentication required" on orchestrator API**
→ Check `CLERK_JWKS_DOMAIN` matches your Clerk dashboard. Also verify `JWT_SECRET` is 32+ chars.

**WebSocket disconnects immediately**
→ Railway needs `WEBSOCKETS=true` on the service. Add it as an env var.

**Clerk says "Invalid Publishable Key"**
→ Web env vars need to come from the Clerk **production** keys, not test keys.
  Switch to production in Clerk Dashboard → API Keys → copy production publishable key.

**Orchestrator won't connect to database**
→ Railway's managed Postgres URL doesn't need `?sslmode=require`.
  Neon URLs DO — make sure your `DATABASE_URL` includes `?sslmode=require` if using Neon.

**`tsx` not found at runtime**
→ The Dockerfile installs all deps (including devDeps) — should work. If not,
  add `tsx` to the `run` command: `CMD ["node_modules/.bin/tsx", "src/index.ts"]`

**Tauri app shows "Clerk not initialized"**
→ Check `index.html` has `window.__clerk_publishable_key` set BEFORE the ClerkJS `<script>` tag.
