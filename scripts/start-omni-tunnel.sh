#!/bin/bash
# Start OmniRoute Tunnel (bash version for WSL/git-bash)

echo "🚀 Starting OmniRoute tunnel..."
echo ""

# Check if OmniRoute is running
if ! curl -s http://localhost:20128/health > /dev/null 2>&1; then
    echo "❌ OmniRoute is not running on localhost:20128"
    echo "Please start OmniRoute first, then run this script again."
    exit 1
fi

echo "✅ OmniRoute is running, starting tunnel..."
echo ""

# Start tunnel
cloudflared tunnel --url http://localhost:20128

echo ""
echo "✅ Tunnel started! Copy the URL and update Vercel env:"
echo "   NEXT_PUBLIC_OMNIROUTE_URL=https://<your-url>.trycloudflare.com/v1"
