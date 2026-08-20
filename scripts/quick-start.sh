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

# 2. Start OmniRoute tunnel only (orchestrator is now directly reachable)
echo "2️⃣  Starting OmniRoute tunnel..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "cd $VPS_DIR && docker compose up -d cloudflared-omni"

# 3. Wait and verify
echo "3️⃣  Verifying services..."
sleep 5

echo ""
echo "✅ Services started:"
echo "   • PostgreSQL: localhost:5432"
echo "   • Orchestrator: http://$VPS_IP:3001 (direct, no tunnel)"
echo "   • OmniRoute: (check tunnel URL from docker logs nox-cloudflared-omni)"
echo ""
echo "📋 Vercel env vars:"
echo "   • NEXT_PUBLIC_ORCHESTRATOR_URL=/api/orchestrator (already set)"
echo "   • NEXT_PUBLIC_OMNIROUTE_URL=see tunnel URL above"
