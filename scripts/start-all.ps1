# ==============================================================================
# SIH-121 / NWIS — Unified One-Command Development & Platform Startup
# ==============================================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SIH-121 EXPLORATION INTELLIGENCE PLATFORM (NWIS)" -ForegroundColor Cyan
Write-Host "  Starting Backend (FastAPI :8000) & Frontend (:4174)..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$WorkspaceRoot = Split-Path -Parent $PSScriptRoot

# 1. Start Backend FastAPI Server
Write-Host "`n[1/2] Launching FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
$BackendProcess = Start-Process python -ArgumentList "-m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000" -WorkingDirectory $WorkspaceRoot -PassThru

# 2. Start Frontend Server
Write-Host "[2/2] Launching Frontend Server on http://127.0.0.1:4174..." -ForegroundColor Green
$FrontendProcess = Start-Process python -ArgumentList "-m http.server 4174 --directory dist" -WorkingDirectory $WorkspaceRoot -PassThru

Start-Sleep -Seconds 2

Write-Host "`n✓ SIH-121 Exploration Platform is RUNNING!" -ForegroundColor Green
Write-Host "  Application UI:  http://127.0.0.1:4174" -ForegroundColor Yellow
Write-Host "  Backend API:     http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host "  API Docs:        http://127.0.0.1:8000/docs" -ForegroundColor Yellow
Write-Host "`nPress Ctrl+C to stop services." -ForegroundColor Gray

try {
    Wait-Process -Id $BackendProcess.Id, $FrontendProcess.Id
} finally {
    Stop-Process -Id $BackendProcess.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $FrontendProcess.Id -ErrorAction SilentlyContinue
}
