# Lumina Prompt Engine - Environment Setup Script (PowerShell)
# Run from project root: .\setup.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host "`n=== Lumina Prompt Engine - Environment Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "[0/5] Checking prerequisites..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Python not found. Please install Python 3.10+ from https://www.python.org/" -ForegroundColor Red
    exit 1
}
Write-Host "  Python: $pythonVersion" -ForegroundColor Green

$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Node.js not found. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green

$npmVersion = npm --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: npm not found. Please install npm" -ForegroundColor Red
    exit 1
}
Write-Host "  npm: $npmVersion" -ForegroundColor Green
Write-Host ""

# 1. Python virtual environment
Write-Host "[1/5] Creating Python virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path "$ProjectRoot\.venv")) {
    python -m venv "$ProjectRoot\.venv"
    Write-Host "  Created .venv" -ForegroundColor Green
} else {
    Write-Host "  .venv already exists" -ForegroundColor Gray
}

# 2. Upgrade pip
Write-Host "`n[2/5] Upgrading pip..." -ForegroundColor Yellow
& "$ProjectRoot\.venv\Scripts\pip.exe" install --upgrade pip -q
Write-Host "  pip upgraded" -ForegroundColor Green

# 3. Install backend deps
Write-Host "`n[3/5] Installing backend dependencies..." -ForegroundColor Yellow
& "$ProjectRoot\.venv\Scripts\pip.exe" install -r "$ProjectRoot\backend\requirements.txt" -q
& "$ProjectRoot\.venv\Scripts\pip.exe" install -e ".[dev]" -q
Write-Host "  Backend packages installed" -ForegroundColor Green

# 4. Ensure .env exists
Write-Host "`n[4/5] Checking .env..." -ForegroundColor Yellow
if (-not (Test-Path "$ProjectRoot\.env")) {
    if (Test-Path "$ProjectRoot\backend\.env.example") {
        Copy-Item "$ProjectRoot\backend\.env.example" "$ProjectRoot\.env"
        Write-Host "  Created .env from backend\.env.example" -ForegroundColor Yellow
        Write-Host "  ⚠️  IMPORTANT: Edit .env and add your API keys!" -ForegroundColor Red
    } else {
        Write-Host "  No .env found. Create .env with your API keys (see backend\.env.example)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  .env exists" -ForegroundColor Green
}

# 5. Frontend dependencies
Write-Host "`n[5/5] Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location "$ProjectRoot\frontend"
npm install
Pop-Location
Write-Host "  Frontend packages installed" -ForegroundColor Green

Write-Host "`n=== Setup complete! ===" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor White
Write-Host "  1. Edit .env and add your API keys (see backend\.env.example for reference)" -ForegroundColor Yellow
Write-Host "  2. Run the application:" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 1 (Backend):" -ForegroundColor Cyan
Write-Host "    .\.venv\Scripts\activate" -ForegroundColor Gray
Write-Host "    uvicorn backend.main:app --reload --port 8000" -ForegroundColor Gray
Write-Host ""
Write-Host "  Terminal 2 (Frontend):" -ForegroundColor Cyan
Write-Host "    cd frontend" -ForegroundColor Gray
Write-Host "    npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  Then open:" -ForegroundColor White
Write-Host "    Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "    API docs:  http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""
