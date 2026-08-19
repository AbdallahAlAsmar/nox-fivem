@echo off
:: NOX Tunnel Manager (Windows batch version)
:: Usage: tunnel-manager.cmd start|stop|status|update

set SSH_KEY=C:\Users\2026\.ssh\oracle.key
set VPS_USER=ubuntu
set VPS_IP=158.101.167.118
set VPS_DIR=%USERPROFILE%\nox-fivem

if "%1%"=="start" (
    echo 🚀 Starting Cloudflare tunnels...
    ssh -i "%SSH_KEY%" -o StrictHostKeyChecking=no %VPS_USER%@%VPS_IP% "cd %VPS_DIR% && docker compose up -d cloudflared-omni cloudflared-orchestrator"
    echo ✅ Tunnels started
    echo    OmniRoute: https://strict-souls-interesting-amazing.trycloudflare.com
    echo    Orchestrator: https://nations-organizing-cheapest-acute.trycloudflare.com
) else if "%1%"=="stop" (
    echo ⏹ Stopping Cloudflare tunnels...
    ssh -i "%SSH_KEY%" -o StrictHostKeyChecking=no %VPS_USER%@%VPS_IP% "cd %VPS_DIR% && docker compose stop cloudflared-omni cloudflared-orchestrator"
    echo ✅ Tunnels stopped
) else if "%1%"=="status" (
    echo 📊 Tunnel Status:
    ssh -i "%SSH_KEY%" -o StrictHostKeyChecking=no %VPS_USER%@%VPS_IP% "cd %VPS_DIR% && docker compose ps cloudflared-omni cloudflared-orchestrator"
) else (
    echo Usage: tunnel-manager.cmd {start|stop|status|update}
    echo.
    echo Commands:
    echo   start   - Start both tunnels
    echo   stop    - Stop both tunnels
    echo   status  - Check tunnel status
    echo   update  - Update URLs in Vercel
)
