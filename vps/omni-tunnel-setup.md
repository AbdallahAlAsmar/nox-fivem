# OmniRoute Tunnel Setup

## Problem
The AI chat shows "Response received." because OmniRoute isn't connected.

## Solution

### Option 1: Start Tunnel Manually

1. **Start OmniRoute** on your PC (port 20128)
2. **Open a new terminal** and run:
   ```bash
   # Windows
   D:/fivem-dev/scripts/start-omni-tunnel.cmd
   
   # Or Bash
   bash D:/fivem-dev/scripts/start-omni-tunnel.sh
   ```
3. **Copy the URL** shown (e.g., `https://strict-souls-interesting-amazing.trycloudflare.com`)
4. **Update Vercel env vars:**
   - Go to https://vercel.com/dashboard → nox-fivem → Settings → Environment Variables
   - Update `NEXT_PUBLIC_OMNIROUTE_URL` to:
     ```
     https://strict-souls-interesting-amazing.trycloudflare.com/v1
     ```
5. **Redeploy** on Vercel

---

### Option 2: Docker on VPS (Better for Production)

Run OmniRoute on the VPS instead of locally:

```bash
# SSH to VPS
ssh -i C:/Users/2026/.ssh/oracle.key ubuntu@158.101.167.118

# Pull OmniRoute image
docker pull ghcr.io/omni-router/omni-route:latest

# Run OmniRoute
docker run -d \
  --name omni-route \
  -p 20128:20128 \
  ghcr.io/omni-router/omni-route:latest

# Create tunnel for OmniRoute
docker run -d \
  --name cloudflared-omni \
  cloudflare/cloudflared:latest \
  tunnel --url http://localhost:20128
```

---

### Option 3: Add to Docker Compose

Update `D:/fivem-dev/vps/docker-compose.yml` to include OmniRoute:

```yaml
services:
  # ... existing services ...
  
  omni-route:
    image: ghcr.io/omni-router/omni-route:latest
    container_name: nox-omni-route
    restart: unless-stopped
    ports:
      - "20128:20128"
    
  cloudflared-omni:
    image: cloudflare/cloudflared:latest
    container_name: nox-cloudflared-omni
    restart: unless-stopped
    command: tunnel --url http://nox-omni-route:20128
    depends_on:
      - omni-route
```

Then:
```bash
ssh -i C:/Users/2026/.ssh/oracle.key ubuntu@158.101.167.118
cd ~/nox-fivem
docker compose up -d
```

---

## Current Status

| Service | Status | URL |
|---------|--------|-----|
| PostgreSQL | ✅ Running | VPS:5432 |
| Orchestrator | ✅ Running | `https://nations-organizing-cheapest-acute.trycloudflare.com` |
| OmniRoute | ❌ **Not running** | Need to start |

## Quick Fix (Right Now)

```bash
# 1. Start OmniRoute on your PC
# (Open your OmniRoute app/terminal)

# 2. Start tunnel in new terminal
cloudflared tunnel --url http://localhost:20128

# 3. Copy the URL and update Vercel
```

Then update Vercel env var:
- `NEXT_PUBLIC_OMNIROUTE_URL` = `https://<your-url>.trycloudflare.com/v1`
