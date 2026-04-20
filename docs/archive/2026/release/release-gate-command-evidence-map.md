# Release Gate Command + Evidence Map

Last updated: 2026-04-17 11:50:47 +02:00
Status: [PARTIAL DONE]
Purpose: Map each release gate to executable checks and concrete evidence artifacts.

## Gate 1 - Runtime and Data Readiness

Commands:

```powershell
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Expected:
- Prisma generate/migrate/seed succeed without drift failures.

Evidence to attach:
- command output log links
- schema/migration commit SHA
- seed result snapshot

## Gate 2 - Security and Authorization

Commands:

```powershell
npm test -- tests/integration/billingPlans.spec.ts
npm test -- tests/integration/authOtpFlows.spec.ts
```

Expected:
- Billing mutations reject non-admin users with `403`.
- OTP/security guard tests pass.

Evidence to attach:
- test run output links
- API response captures for `401/403` negative cases

## Gate 3 - Billing and Webhook Correctness

Commands:

```powershell
npm test -- tests/integration/billingWebhookLifecycle.spec.ts
npm test -- tests/integration/jobSeekerWebhookIdempotency.spec.ts
npm run test:release:ci
```

Expected:
- Webhook replays are idempotent.
- No double credit/subscription effects.

Evidence to attach:
- Stripe replay IDs + app logs
- DB snapshots before/after replay
- release smoke run link

## Gate 4 - CI/CD Release Automation

Commands:

```powershell
# Local parity for CI chain
npm run ci:prisma
npm run build
npm test
npm run test:release:ci
```

Expected:
- `.github/workflows/ci.yml` passes on PR.
- Required checks configured in repo settings.

Evidence to attach:
- CI workflow run URL
- screenshot of required-check rules in GitHub settings

## Gate 5 - Observability and Operability

Commands:

```powershell
# Start API and worker to inspect correlated logs
npm run dev
npm run dev:worker
```

Expected:
- `x-request-id` appears in API logs.
- Worker logs include queue/job/event IDs.
- Errors are traceable across request -> job chain.

Evidence to attach:
- structured log excerpts for one happy path and one failure path
- request ID correlation screenshot

## Gate 6 - Frontend/UAT Readiness

Commands:

```powershell
npm run test:release
```

Manual checklist:
- `docs/uat-smoke-checklist.md`
- API contracts in `docs/api-contracts-*.md`

Expected:
- UAT checklist fully completed with PASS signoff.
- Contract docs reflect current endpoint behavior.

Evidence to attach:
- completed UAT checklist
- Postman collection/report links
- FE integration notes

## Current open items

- [x] Configure required checks in GitHub repository settings (external step).
- [ ] Attach screenshot/URL proof of branch protection + required checks.
- [ ] Attach first real release evidence links for each gate.

