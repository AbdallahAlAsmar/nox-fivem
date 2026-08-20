# NOX VPS Setup

## Quick Start (After PC Restart)

1. **Run the tunnel manager:**
   ```bash
   # Windows
   D:/fivem-dev/scripts/tunnel-manager.cmd start
   
   # Or Bash
   bash D:/fivem-dev/scripts/quick-start.sh
   ```

2. **No Vercel env updates needed** — `NEXT_PUBLIC_ORCHESTRATOR_URL` is already set to `/api/orchestrator` (production proxy).

3. **Redeploy** only if you change other env vars.

---

## Architecture

- **Orchestrator**: `http://158.101.167.118:3001` (direct, no tunnel)
- **Vercel**: proxies `/api/orchestrator/*` → orchestrator
- **Tunnels**: OmniRoute only (Cloudflare tunnel → VPS)

---

## Why Tunnel URLs Change

Cloudflare Quick Tunnels are **ephemeral** — new random URL on every restart.

## Solution: Persistent Tunnel (Optional)

For a static URL, use a Cloudflare Account + Domain:

```bash
# 1. Login
cloudflared tunnel login

# 2. Create tunnel
cloudflared tunnel create nox-omni

# 3. Get credentials
cat ~/.cloudflared/<tunnel-id>.json

# 4. Set up DNS
cloudflared tunnel route dns nox-omni omni.nox.dev

# 5. Run tunnel
cloudflared tunnel run nox-omni --url http://localhost:2026
```

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
docker compose logs -f orchestrator
```
