param(
  [switch]$Once,
  [switch]$Install,
  [switch]$Test
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

# Keep the original entry point as the single launcher for both services.
& (Join-Path $ProjectRoot "ui-start.ps1") -Once:$Once -Install:$Install -Test:$Test
exit $LASTEXITCODE
