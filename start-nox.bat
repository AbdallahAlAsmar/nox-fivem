@echo off
echo Starting NOX Dashboard...
echo.
echo Web App:      http://localhost:3000
echo Orchestrator: http://localhost:3001
echo.
echo Press any key to start the web app...
pause >nul

cd /d "D:\fivem-dev\apps\web"
start http://localhost:3000
start "" cmd /c "pnpm dev --port 3000"

echo.
echo Web app starting on port 3000...
echo.
pause
