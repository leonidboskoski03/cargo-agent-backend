param(
  [string]$BackendBaseUrl = "http://localhost:4000",
  [string]$FrontendBaseUrl = "http://localhost:5173"
)

$ErrorActionPreference = "Stop"

function Test-HttpRoute {
  param(
    [string]$Name,
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec 10
    Write-Host "[PASS] $Name $($response.StatusCode) $Url"
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 401 -or $status -eq 403) {
      Write-Host "[PASS] $Name protected $status $Url"
      return
    }

    Write-Host "[FAIL] $Name $Url"
    throw
  }
}

Write-Host "Cargo Agent release smoke"
Write-Host "Backend:  $BackendBaseUrl"
Write-Host "Frontend: $FrontendBaseUrl"

Test-HttpRoute -Name "Backend live health" -Url "$BackendBaseUrl/health/live"
Test-HttpRoute -Name "Backend ready health" -Url "$BackendBaseUrl/health/ready"

$frontendRoutes = @(
  "/dashboard",
  "/locations",
  "/routes",
  "/posts",
  "/posts/quick",
  "/contracts",
  "/fleet",
  "/fleet/vehicles",
  "/vehicle-marketplace",
  "/vehicle-marketplace/new",
  "/vehicle-marketplace/mine",
  "/vehicle-marketplace/inquiries",
  "/jobs",
  "/jobs/mine",
  "/job-wallet",
  "/documents",
  "/notifications",
  "/reviews",
  "/billing",
  "/company",
  "/team",
  "/release-readiness"
)

foreach ($route in $frontendRoutes) {
  Test-HttpRoute -Name "Frontend route $route" -Url "$FrontendBaseUrl$route"
}

Write-Host "Smoke complete. Authenticated workflow evidence still requires manual UAT artifacts."
