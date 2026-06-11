param(
  [switch]$SkipValidate
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$clientDir = Join-Path $repoRoot "node_modules\.prisma\client"

Write-Host "Cargo Agent Prisma generate helper"
Write-Host "Repository: $repoRoot"

if (Test-Path $clientDir) {
  Get-ChildItem -LiteralPath $clientDir -Filter "query_engine-windows.dll.node.tmp*" -File -ErrorAction SilentlyContinue |
    ForEach-Object {
      Write-Host "Removing stale Prisma temp engine $($_.Name)"
      Remove-Item -LiteralPath $_.FullName -Force
    }
}

Push-Location $repoRoot
try {
  if (-not $SkipValidate) {
    npm run prisma:validate
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  }
  npm run prisma:generate
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}
