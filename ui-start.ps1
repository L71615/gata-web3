param([switch]$Install,[switch]$Test)
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 20+ is required." }
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env"; Write-Host "Created .env with safe paper-mode defaults." -ForegroundColor Yellow }
if ($Install -or -not (Test-Path "node_modules")) { npm ci; if ($LASTEXITCODE -ne 0) { throw "npm ci failed." } }
npm run build; if ($LASTEXITCODE -ne 0) { throw "Build failed." }
if ($Test) { npm test; if ($LASTEXITCODE -ne 0) { throw "Tests failed." } }
Write-Host "Starting scanner and dashboard at http://127.0.0.1:8787" -ForegroundColor Green
Start-Process "http://127.0.0.1:8787"
node ui/server.mjs
