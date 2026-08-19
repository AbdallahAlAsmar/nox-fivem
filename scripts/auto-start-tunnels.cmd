@echo off
:: Auto-start NOX Cloudflare tunnels
:: Add this to Windows Task Scheduler to run on login

echo Starting NOX tunnels...

:: Start OmniRoute tunnel
start /min cmd /c "cloudflared tunnel --url http://localhost:20128"

:: Wait for tunnel to start
timeout /t 5 /nobreak >nul

:: Start Orchestrator tunnel  
start /min cmd /c "ssh -i C:\Users\2026\.ssh\oracle.key ubuntu@158.101.167.118 'cd ~/nox-fivem && docker compose up -d cloudflared-orchestrator'"

echo Done. Tunnels starting in background.
