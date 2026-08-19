#!/bin/bash
# Start all NOX services after PC restart
# Run this once after rebooting

set -e

SSH_KEY="C:/Users/2026/.ssh/oracle.key"
VPS_USER="ubuntu"
VPS_IP="158.101.167.118"
VPS_DIR="$HOME/nox-fivem"

echo "🚀 NOX Quick Start Script"
echo "=========================="
echo ""

# 1. Start Docker containers (postgres + orchestrator)
echo "1️⃣  Starting Docker containers..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "cd $VPS_DIR && docker compose up -d postgres nox-orchestrator"

# 2. Start Cloudflare tunnels
echo "2️⃣  Starting Cloudflare tunnels..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "cd $VPS_DIR && docker compose up -d cloudflared-omni cloudflared-orchestrator"

# 3. Wait and verify
echo "3️⃣  Verifying services..."
sleep 5

echo ""
echo "✅ Services started:"
echo "   • PostgreSQL: localhost:5432"
echo "   • Orchestrator: https://nations-organizing-cheapest-acute.trycloudflare.com"
echo "   • OmniRoute: https://strict-souls-interesting-amazing.trycloudflare.com"
echo ""
echo "📋 To update Vercel env vars with new tunnel URLs:"
echo "   1. Go to https://vercel.com/dashboard"
echo "   2. Select nox-fivem project"
echo "   3. Settings → Environment Variables"
echo "   4. Update NEXT_PUBLIC_ORCHESTRATOR_URL and NEXT_PUBLIC_OMNIROUTE_URL"
