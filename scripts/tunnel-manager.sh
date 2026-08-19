#!/bin/bash
# NOX Cloudflare Tunnel Manager
# Usage: ./tunnel-manager.sh start|stop|status|update

set -e

SSH_KEY="C:/Users/2026/.ssh/oracle.key"
VPS_USER="ubuntu"
VPS_IP="158.101.167.118"
VPS_DIR="$HOME/nox-fivem"

omni_route_tunnel="https://strict-souls-interesting-amazing.trycloudflare.com"
orchestrator_tunnel="https://nations-organizing-cheapest-acute.trycloudflare.com"

case "$1" in
  start)
    echo "🚀 Starting Cloudflare tunnels..."
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "cd $VPS_DIR && docker compose up -d cloudflared-omni cloudflared-orchestrator"
    echo "✅ Tunnels started"
    echo "   OmniRoute: $omni_route_tunnel"
    echo "   Orchestrator: $orchestrator_tunnel"
    ;;
    
  stop)
    echo "⏹ Stopping Cloudflare tunnels..."
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "cd $VPS_DIR && docker compose stop cloudflared-omni cloudflared-orchestrator"
    echo "✅ Tunnels stopped"
    ;;
    
  status)
    echo "📊 Tunnel Status:"
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "cd $VPS_DIR && docker compose ps cloudflared-omni cloudflared-orchestrator"
    ;;
    
  update)
    echo "🔄 Updating tunnel URLs..."
    # Get new URLs from Cloudflare
    new_omni=$(ssh -i "$SSH_KEY" "$VPS_USER@$VPS_IP" "curl -s https://api.cloudflareclient.com/v0a2487/reg/ 2>/dev/null | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1" || echo "")
    new_orch=$(ssh -i "$SSH_KEY" "$VPS_USER@$VPS_IP" "curl -s https://api.cloudflareclient.com/v0a2487/reg/ 2>/dev/null | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1" || echo "")
    
    if [ -n "$new_omni" ] && [ -n "$new_orch" ]; then
      echo "New OmniRoute: $new_omni"
      echo "New Orchestrator: $new_orch"
    fi
    ;;
    
  *)
    echo "Usage: $0 {start|stop|status|update}"
    exit 1
    ;;
esac
