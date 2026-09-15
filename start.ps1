param(
  [switch]$Once,
  [switch]$Install,
  [switch]$Test
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

function Require-Command([string]$Name, [string]$InstallHint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name not found. $InstallHint"
  }
}

Require-Command "node" "Install Node.js 20 or newer, then run this script again."
Require-Command "npm" "Install npm with Node.js, then run this script again."

$NodeMajor = [int]((node --version).TrimStart("v").Split(".")[0])
if ($NodeMajor -lt 20) {
  throw "Node.js 20 or newer is required. Current version: $(node --version)"
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example. Default mode is paper; live trading is disabled." -ForegroundColor Yellow
}

if ($Install -or -not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..." -ForegroundColor Cyan
  npm ci
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }
}

Write-Host "Building GATE..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed." }

if ($Test) {
  Write-Host "Running tests..." -ForegroundColor Cyan
  npm test
  if ($LASTEXITCODE -ne 0) { throw "Tests failed." }
}

if ($Once) {
  Write-Host "Running one read-only scan..." -ForegroundColor Green
  npm run scan
} else {
  Write-Host "Starting GATE in $((Get-Content .env | Where-Object { $_ -match '^GATE_MODE=' }) -replace '^GATE_MODE=', '') mode. Press Ctrl+C to stop." -ForegroundColor Green
  npm start
}

exit $LASTEXITCODE
