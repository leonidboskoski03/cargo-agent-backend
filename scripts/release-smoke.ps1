param(
  [string]$BackendBaseUrl = "http://localhost:4000",
  [string]$FrontendBaseUrl = "http://localhost:5173",
  [string]$EvidenceDate = (Get-Date -Format "yyyy-MM-dd")
)

$ErrorActionPreference = "Stop"
$evidenceDir = Join-Path (Get-Location) "docs\release\evidence\$EvidenceDate\G-001-uat-smoke"
New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null

$checks = @(
  @{ Name = "backend-live"; Url = "$BackendBaseUrl/health/live" },
  @{ Name = "backend-ready"; Url = "$BackendBaseUrl/health/ready" },
  @{ Name = "frontend-dashboard"; Url = "$FrontendBaseUrl/dashboard" },
  @{ Name = "frontend-locations"; Url = "$FrontendBaseUrl/locations" },
  @{ Name = "frontend-routes"; Url = "$FrontendBaseUrl/routes" },
  @{ Name = "frontend-posts"; Url = "$FrontendBaseUrl/posts" },
  @{ Name = "frontend-posts-quick"; Url = "$FrontendBaseUrl/posts/quick" },
  @{ Name = "frontend-contracts"; Url = "$FrontendBaseUrl/contracts" },
  @{ Name = "frontend-jobs"; Url = "$FrontendBaseUrl/jobs" },
  @{ Name = "frontend-jobs-mine"; Url = "$FrontendBaseUrl/jobs/mine" },
  @{ Name = "frontend-job-wallet"; Url = "$FrontendBaseUrl/job-wallet" },
  @{ Name = "frontend-fleet"; Url = "$FrontendBaseUrl/fleet" },
  @{ Name = "frontend-billing"; Url = "$FrontendBaseUrl/billing" },
  @{ Name = "frontend-reviews"; Url = "$FrontendBaseUrl/reviews" },
  @{ Name = "frontend-company"; Url = "$FrontendBaseUrl/company" },
  @{ Name = "frontend-release-readiness"; Url = "$FrontendBaseUrl/release-readiness" }
)

$manualFlows = @(
  @{ Id = "UAT-AUTH-001"; Flow = "Log in with an admin account, refresh a protected route, then log out and confirm protected pages redirect." },
  @{ Id = "UAT-MKT-001"; Flow = "Create origin and destination locations, create a route, then create a planned transport post from that route." },
  @{ Id = "UAT-MKT-002"; Flow = "Use a second company to submit a bid, return as the post owner, accept or reject the bid, then capture the resulting state." },
  @{ Id = "UAT-MKT-003"; Flow = "Create a contract from an accepted priced bid and confirm the post detail shows the contract handoff link." },
  @{ Id = "UAT-MKT-004"; Flow = "Move the contract through allowed statuses, complete it, and confirm review eligibility appears only after completion." },
  @{ Id = "UAT-SUP-004"; Flow = "Create or update a completed-contract review and capture any trace-ID error if backend eligibility rejects it." },
  @{ Id = "UAT-WEB-003"; Flow = "Run webhook replay evidence with Stripe test event IDs and duplicate replay proof; attach logs separately." },
  @{ Id = "UAT-OPS-001"; Flow = "Attach CI required-check proof, merge-block proof, and Product/QA/Ops signoff links." }
)

$results = foreach ($check in $checks) {
  try {
    $response = Invoke-WebRequest -Uri $check.Url -UseBasicParsing -TimeoutSec 10
    [PSCustomObject]@{
      name = $check.Name
      url = $check.Url
      statusCode = [int]$response.StatusCode
      ok = $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    }
  } catch {
    [PSCustomObject]@{
      name = $check.Name
      url = $check.Url
      statusCode = $null
      ok = $false
      error = $_.Exception.Message
    }
  }
}

$artifact = [PSCustomObject]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  backendBaseUrl = $BackendBaseUrl
  frontendBaseUrl = $FrontendBaseUrl
  note = "This smoke artifact supports UAT routing/health evidence only. It does not replace human signoff, authenticated workflow screenshots, Stripe replay IDs, or CI branch-protection proof."
  manualFlows = $manualFlows
  checks = $results
}

$artifact | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $evidenceDir "release-smoke.json")
$manualMarkdown = @(
  "# Manual UAT Flow Instructions",
  "",
  "Generated at $((Get-Date).ToUniversalTime().ToString("o"))",
  "",
  "Use this file as reviewer guidance only. Attach screenshots, provider logs, CI links, Stripe event IDs, and signoff artifacts separately.",
  ""
)
foreach ($flow in $manualFlows) {
  $manualMarkdown += "- **$($flow.Id)**: $($flow.Flow)"
}
$manualMarkdown | Set-Content -Path (Join-Path $evidenceDir "manual-flow-instructions.md")
$results | Format-Table -AutoSize

if ($results | Where-Object { -not $_.ok }) {
  exit 1
}
