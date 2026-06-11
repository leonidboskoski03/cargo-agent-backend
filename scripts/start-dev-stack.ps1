param(
  [switch]$SkipInfra,
  [switch]$SkipBackend,
  [switch]$SkipWorker,
  [switch]$SkipFrontend,
  [switch]$SkipStripe,
  [string]$FrontendPath = "..\cargo-agent-frontend",
  [string]$StripeForwardTo = "http://localhost:4000/webhooks/stripe"
)

$ErrorActionPreference = "Stop"

$BackendPath = Resolve-Path (Join-Path $PSScriptRoot "..")
$FrontendFullPath = Resolve-Path (Join-Path $BackendPath $FrontendPath)

function Start-DevWindow {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string]$Command
  )

  $script = @"
`$Host.UI.RawUI.WindowTitle = '$Title'
Set-Location -LiteralPath '$WorkingDirectory'
$Command
"@

  Start-Process powershell.exe -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $script
  ) | Out-Null
}

Write-Host "Cargo Agent dev stack launcher" -ForegroundColor Cyan
Write-Host "Backend:  $BackendPath"
Write-Host "Frontend: $FrontendFullPath"

if (-not $SkipInfra) {
  Write-Host "Starting Postgres and Redis with Docker Compose..." -ForegroundColor Yellow
  Push-Location $BackendPath
  try {
    docker compose up -d postgres redis
  } finally {
    Pop-Location
  }
}

if (-not $SkipBackend) {
  Start-DevWindow -Title "Cargo Agent API :4000" -WorkingDirectory $BackendPath -Command "npm run dev"
}

if (-not $SkipWorker) {
  Start-DevWindow -Title "Cargo Agent Worker" -WorkingDirectory $BackendPath -Command "npm run dev:worker"
}

if (-not $SkipFrontend) {
  Start-DevWindow -Title "Cargo Agent Frontend :5173" -WorkingDirectory $FrontendFullPath -Command "npm run dev -- --host 0.0.0.0"
}

if (-not $SkipStripe) {
  $stripeCommand = Get-Command stripe -ErrorAction SilentlyContinue
  if ($stripeCommand) {
    Start-DevWindow -Title "Stripe Webhook Listener" -WorkingDirectory $BackendPath -Command "stripe listen --forward-to $StripeForwardTo"
  } else {
    Write-Host "Stripe CLI was not found. Install it or run with -SkipStripe." -ForegroundColor Yellow
    Write-Host "After installing, run: stripe login; stripe listen --forward-to $StripeForwardTo"
  }
}

Write-Host ""
Write-Host "Started requested dev processes." -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend:  http://localhost:4000/api/v1"
Write-Host "Health:   http://localhost:4000/health/live"
Write-Host ""
Write-Host "Useful flags:"
Write-Host "  -SkipStripe   Start app without Stripe listener"
Write-Host "  -SkipWorker   Start app without BullMQ worker"
Write-Host "  -SkipInfra    Do not start Docker Postgres/Redis"
