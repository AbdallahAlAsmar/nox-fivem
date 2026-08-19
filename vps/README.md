# NOX VPS Setup

## Quick Start (After PC Restart)

1. **Run the tunnel manager:**
   ```bash
   # Windows
   D:/fivem-dev/scripts/tunnel-manager.cmd start
   
   # Or Bash
   bash D:/fivem-dev/scripts/quick-start.sh
   ```

2. **Update Vercel environment variables:**
   - Go to https://vercel.com/dashboard
   - Click **nox-fivem** → **Settings** → **Environment Variables**
   - Update these values with the NEW tunnel URLs shown:
     - `NEXT_PUBLIC_ORCHESTRATOR_URL` = new tunnel URL
     - `NEXT_PUBLIC_OMNIROUTE_URL` = new OmniRoute URL

3. **Redeploy:**
   - Click **Deployments** → **Redeploy**

---

## Why URLs Change

Cloudflare Quick Tunnels are **ephemeral** - they create a new random URL every time. This is by design.

## Solution: Persistent Tunnel

For a static URL, use a Cloudflare Account + Domain:

```bash
# 1. Login
cloudflared tunnel login

# 2. Create tunnel
cloudflared tunnel create nox-api

# 3. Get credentials
cat ~/.cloudflared/<tunnel-id>.json

# 4. Set up DNS (points to tunnel)
cloudflared tunnel route dns nox-api api.nox.dev

# 5. Run tunnel
cloudflared tunnel run nox-api --url http://localhost:20128 --url http://localhost:3001
```

This gives you permanent URLs like:
- `https://api.nox.dev` (never changes)
- `https://chat.nox.dev` (for OmniRoute)

---

## Docker Compose Location

```
D:/fivem-dev/vps/docker-compose.yml
```

## VPS Access

```bash
ssh -i C:/Users/2026/.ssh/oracle.key ubuntu@158.101.167.118
cd ~/nox-fivem
docker compose ps
docker compose logs -f cloudflared-orchestrator
```
