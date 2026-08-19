@echo off
:: NOX Quick Start (Windows)
:: Run this after PC restart

echo 🚀 NOX Quick Start Script
echo ==========================
echo.

echo 1️⃣  Starting Docker containers...
ssh -i "C:\Users\2026\.ssh\oracle.key" -o StrictHostKeyChecking=no ubuntu@158.101.167.118 "cd %USERPROFILE%\nox-fivem && docker compose up -d postgres nox-orchestrator"

echo 2️⃣  Starting Cloudflare tunnels...
ssh -i "C:\Users\2026\.ssh\oracle.key" -o StrictHostKeyChecking=no ubuntu@158.101.167.118 "cd %USERPROFILE%\nox-fivem && docker compose up -d cloudflared-omni cloudflared-orchestrator"

echo.
echo ✅ Services started!
echo.
echo    OmniRoute: https://strict-souls-interesting-amazing.trycloudflare.com
echo    Orchestrator: https://nations-organizing-cheapest-acute.trycloudflare.com
echo.
echo 📋 Next: Update Vercel environment variables with new URLs
echo    → https://vercel.com/dashboard → nox-fivem → Settings → Environment Variables
