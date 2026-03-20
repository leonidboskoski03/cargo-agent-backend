# Release Runbook (MVP)

Last updated: 2026-03-20

This runbook validates the backend in a clean environment before MVP release.

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
```

Pass condition:

- Build passes.
- All tests pass.

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

## 9) Release Decision Gate

Release is GO if:

- Build/tests green.
- Migrations and seed validated.
- API + worker runtime stable.
- Webhook lifecycle + replay checks pass.
- No unresolved P0 defects in QA/UAT.

## 10) Rollback Notes

If release fails after DB migration:

1. Stop API and worker.
2. Restore DB snapshot/backups according to environment policy.
3. Re-deploy last known good backend version.
4. Re-run health checks.

Document incident and failed step before next rollout.

