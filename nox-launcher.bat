@echo off
title NOX Dashboard
echo ========================================
echo   NOX FiveM Dashboard Launcher
echo ========================================
echo.
echo Starting services...
echo.

cd /d "D:\fivem-dev\apps\orchestrator"
start "NOX Orchestrator" cmd /c "pnpm dev"

timeout /t 3 /nobreak >nul

cd /d "D:\fivem-dev\apps\web"
start "NOX Web" cmd /c "pnpm dev --port 3000"

timeout /t 4 /nobreak >nul

start http://localhost:3000

echo.
echo ========================================
echo   NOX Dashboard is running!
echo.
echo   Web:      http://localhost:3000
echo   API:      http://localhost:3001
echo   Database: localhost:5432 (docker)
echo ========================================
echo.
echo Close this window to stop the web app.
echo The orchestrator will keep running.
echo.
pause
