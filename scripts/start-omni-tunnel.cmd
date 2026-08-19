@echo off
:: Start OmniRoute Tunnel
:: Run this after starting OmniRoute on port 20128

echo 🚀 Starting OmniRoute tunnel...
echo.

:: Check if OmniRoute is running
curl -s http://localhost:20128/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ OmniRoute is not running on localhost:20128
    echo Please start OmniRoute first, then run this script again.
    pause
    exit /b 1
)

echo ✅ OmniRoute is running, starting tunnel...
echo.

:: Start tunnel (this will show a URL like https://xxx.trycloudflare.com)
cloudflared tunnel --url http://localhost:20128

echo.
echo ✅ Tunnel started! Copy the URL and update Vercel env:
echo    NEXT_PUBLIC_OMNIROUTE_URL=https://<your-url>.trycloudflare.com/v1
pause
