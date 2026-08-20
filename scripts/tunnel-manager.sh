#!/bin/bash
# NOX Cloudflare Tunnel Manager (OmniRoute only — orchestrator tunnel removed)
# Usage: ./tunnel-manager.sh start|stop|status|update

set -e

SSH_KEY="C:/Users/2026/.ssh/oracle.key"
VPS_USER="ubuntu"
VPS_IP="158.101.167.118"
VPS_DIR="$HOME/nox-fivem"

omni_route_tunnel="https://strict-souls-interesting-amazing.trycloudflare.com"

case "$1" in
  start)
    echo "🚀 Starting Cloudflare tunnels..."
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "cd $VPS_DIR && docker compose up -d cloudflared-omni"
    echo "✅ Tunnel started"
    echo "   OmniRoute: $omni_route_tunnel"
    echo "   Orchestrator: http://$VPS_IP:3001 (direct, no tunnel)"
    ;;
    
  stop)
    echo "⏹ Stopping Cloudflare tunnels..."
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "cd $VPS_DIR && docker compose stop cloudflared-omni"
    echo "✅ Tunnel stopped"
    ;;
    
  status)
    echo "📊 Tunnel Status:"
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "cd $VPS_DIR && docker compose ps cloudflared-omni"
    ;;
    
  update)
    echo "🔄 Updating tunnel URLs..."
    # Get new OmniRoute URL from Cloudflare
    new_omni=$(ssh -i "$SSH_KEY" "$VPS_USER@$VPS_IP" "docker logs nox-cloudflared-omni 2>&1 | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1" || echo "")
    
    if [ -n "$new_omni" ]; then
      echo "New OmniRoute: $new_omni"
      echo "Update VPS orchestrator env:"
      echo "  docker compose up -d --force-recreate orchestrator"
    else
      echo "⚠️  Could not get new tunnel URL"
    fi
    ;;
    
  *)
    echo "Usage: $0 {start|stop|status|update}"
    exit 1
    ;;
esac
