# ─── Cloudflare Tunnel — OmniRoute Exposure ─────────────────────────
# This script creates a persistent tunnel so the hosted orchestrator
# can reach your local OmniRoute instance.

# Prerequisites:
#   1. Install cloudflared: winget install Cloudflare.cloudflared
#   2. Login: cloudflared tunnel login
#   3. Create tunnel: cloudflared tunnel create omni-route
#   4. Save the tunnel credentials: cloudflared tunnel route dns <tunnel-id> <domain>
#   5. Start: cloudflared tunnel run omni-route

# Or use the quick tunnel (no account needed, URL changes on restart):
# cloudflared tunnel --url http://localhost:20128

# ─── Tunnel Command ──────────────────────────────────────────────────
# Replace YOUR_TUNNEL_ID with your actual tunnel ID from step 3
# cloudflared tunnel run YOUR_TUNNEL_ID

# ─── Alternative: Quick Tunnel (no domain needed) ───────────────────
cloudflared tunnel --url http://localhost:20128

# The output will contain a URL like: https://xxxx.trycloudflare.com
# Set this as OMNIROUTE_BASE_URL on Railway: https://xxxx.trycloudflare.com/v1
