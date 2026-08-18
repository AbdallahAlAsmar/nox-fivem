# NOX Dashboard Launcher
# Starts web app and orchestrator, then opens browser

$webPath = "D:\fivem-dev\apps\web"
$orchPath = "D:\fivem-dev\apps\orchestrator"

# Start orchestrator in background
$orchStart = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d $orchPath && pnpm dev" -PassThru -WindowStyle Hidden
Write-Host "Orchestrator starting on port 3001..."

# Wait for orchestrator
Start-Sleep -Seconds 3

# Start web app in background
$webStart = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d $webPath && pnpm dev --port 3000" -PassThru -WindowStyle Hidden
Write-Host "Web app starting on port 3000..."

# Wait for web app
Start-Sleep -Seconds 4

# Open browser
Start-Process "http://localhost:3000"
Write-Host "Opening http://localhost:3000"

Write-Host ""
Write-Host "NOX Dashboard is running!"
Write-Host "  Web:      http://localhost:3000"
Write-Host "  API:      http://localhost:3001"
Write-Host "  Database: localhost:5432 (docker fivem-dev-db)"
Write-Host ""
Write-Host "Press any key to exit (services will keep running)..."
$null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
