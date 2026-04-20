# Release Runbook (MVP)

Last updated: 2026-04-02

This runbook validates the backend in a clean environment before MVP release.

Related release assets:

- `docs/release-gate-command-evidence-map.md`
- `docs/uat-smoke-checklist.md`
- `docs/tracking/[PARTIAL DONE]-Final-GO-NO-GO-Readiness-Tracker.md`

## 1) Preconditions

- PostgreSQL is available and reachable.
- Redis is available if `BULLMQ_ENABLED=true`.
- Stripe webhook secret and API key are configured for target environment.
- `.env` is populated with release values.

## 2) Install + Generate

```powershell
npm install
npm run prisma:generate
```

## 3) Apply Migrations + Seed

```powershell
npm run prisma:migrate
npm run prisma:seed
```

Validation checks:

- Migration succeeds without drift errors.
- Seed completes and includes company plans + job seeker credit packs.

## 4) Static Quality Gate

```powershell
npm run build
npm test
npm run test:release
```

Pass condition:

- Build passes.
- All tests pass.
- Release-critical integration suite passes.

## 5) Start API + Worker

Run API:

```powershell
npm run dev
```

Run worker in separate terminal:

```powershell
npm run dev:worker
```

Pass condition:

- API process starts without runtime initialization errors.
- Worker starts both billing webhook and notification event workers when enabled.

## 6) API Smoke + Core Flows

Verify:

- `GET /health/live`
- `GET /health/ready`
- Core authenticated routes respond without 5xx.

Core flow checks:

1. JOB_SEEKER register/login.
2. Company invite create -> accept.
3. Post -> bid -> contract -> review lifecycle.
4. Job application submit with billing metadata in response.

## 7) Stripe Webhook Validation

Use Stripe CLI or dashboard replay in non-production test mode.

Required checks:

- `checkout.session.completed` (company billing lane)
- `customer.subscription.created`
- `customer.subscription.deleted`
- `checkout.session.completed` with `lane=JOB_SEEKER_CREDITS`

Pass condition:

- Events are processed once.
- Replay events are skipped idempotently.
- Company subscription state updates correctly.
- Job seeker wallet receives credits exactly once per checkout session.

## 8) Logging + Audit Validation

Validate logs contain:

- webhook replay skip messages
- queue job completion/failure logs
- invite email preview logs in non-production

Validate audit logs endpoint for company admin:

- includes key workflow events (bids/contracts/adjustments where applicable)

## 9) Production Closeout Checklist (Go/No-Go)

Use this section as the final release gate. Every gate should have evidence links (test run, logs, screenshots, or PR references).

### Gate 1 - Runtime and Data Readiness
- [ ] Environment variables validated (`src/config/env.ts`)
- [ ] Infrastructure dependencies reachable (Postgres/Redis/Stripe)
- [ ] Prisma schema and migrations up-to-date (`prisma/schema.prisma`, migrations)
- [ ] Seed/runtime boot path verified (`package.json` scripts, local/staging)

Evidence:
- 

### Gate 2 - Security and Authorization
- [ ] Billing/subscription write actions restricted to `COMPANY_ADMIN`
- [ ] Company-vs-job-seeker flow boundaries enforced
- [ ] OTP limits enabled (attempt caps, expiry, resend throttle)
- [ ] Sensitive auth endpoints have deterministic `401/403` behavior

Evidence:
- 

### Gate 3 - Billing and Webhook Correctness
- [ ] Stripe webhook signature policy configured for target environment
- [ ] Webhook replay/duplicate events are idempotent
- [ ] Job seeker credit top-up cannot be double-applied
- [ ] Company subscription transitions are exactly-once

Primary tests:
- `tests/integration/billingWebhookLifecycle.spec.ts`
- `tests/integration/jobSeekerWebhookIdempotency.spec.ts`
- `tests/integration/releaseSmokeChain.spec.ts`

Evidence:
- 

### Gate 4 - CI/CD Release Automation
- [ ] CI runs `build`, unit/integration tests, and release smoke suite
- [ ] Required checks block merge when failing
- [ ] Artifact build is reproducible from clean environment
- [ ] Staging deploy workflow and rollback steps are documented

Suggested workflow file:
- `.github/workflows/ci.yml`

Evidence:
- 

### Gate 5 - Observability and Operability
- [ ] Request correlation ID available in API logs
- [ ] Worker/job logs include queue/job/event IDs
- [ ] Error responses and server logs are diagnosable
- [ ] Alerting baseline exists for auth/billing/webhook failures

Evidence:
- 

### Gate 6 - Frontend/UAT Readiness
- [ ] API contracts for auth/invites/billing/job-seeker credits are current
- [ ] End-to-end happy paths verified with Postman or frontend staging
- [ ] UAT smoke checklist executed and signed off
- [ ] Release runbook validated (`docs/release-runbook.md`)

Evidence:
- 

### Final Go/No-Go Decision
- [ ] GO
- [ ] NO-GO

Decision notes:
- 

Approvers:
- Product:
- Backend:
- QA:
- Ops:

Date:
- 

### Stop-Ship Conditions
- Any money-path duplication risk (credits/subscriptions)
- Any privilege-escalation path in role-protected routes
- Any untraceable P0 failure in auth/billing/webhooks
- Any failing release smoke chain in CI

## 10) Release Decision Gate

Release is GO if:

- Build/tests green.
- Migrations and seed validated.
- API + worker runtime stable.
- Webhook lifecycle + replay checks pass.
- No unresolved P0 defects in QA/UAT.

## 11) Rollback Notes

If release fails after DB migration:

1. Stop API and worker.
2. Restore DB snapshot/backups according to environment policy.
3. Re-deploy last known good backend version.
4. Re-run health checks.

Document incident and failed step before next rollout.
