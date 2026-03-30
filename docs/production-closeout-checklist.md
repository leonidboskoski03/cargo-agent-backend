# Production Closeout Checklist (MVP)

Use this as a release go/no-go checklist. Every gate must have evidence links (test run, logs, screenshots, or PR references).

## Gate 1 - Runtime and Data Readiness
- [ ] Environment variables validated (`src/config/env.ts`)
- [ ] Infrastructure dependencies reachable (Postgres/Redis/Stripe)
- [ ] Prisma schema and migrations up-to-date (`prisma/schema.prisma`, migrations)
- [ ] Seed/runtime boot path verified (`package.json` scripts, local/staging)

Evidence:
- 

## Gate 2 - Security and Authorization
- [ ] Billing/subscription write actions restricted to `COMPANY_ADMIN`
- [ ] Company-vs-job-seeker flow boundaries enforced
- [ ] OTP limits enabled (attempt caps, expiry, resend throttle)
- [ ] Sensitive auth endpoints have deterministic `401/403` behavior

Evidence:
- 

## Gate 3 - Billing and Webhook Correctness
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

## Gate 4 - CI/CD Release Automation
- [ ] CI runs `build`, unit/integration tests, and release smoke suite
- [ ] Required checks block merge when failing
- [ ] Artifact build is reproducible from clean environment
- [ ] Staging deploy workflow and rollback steps are documented

Suggested workflow file:
- `.github/workflows/ci.yml`

Evidence:
- 

## Gate 5 - Observability and Operability
- [ ] Request correlation ID available in API logs
- [ ] Worker/job logs include queue/job/event IDs
- [ ] Error responses and server logs are diagnosable
- [ ] Alerting baseline exists for auth/billing/webhook failures

Evidence:
- 

## Gate 6 - Frontend/UAT Readiness
- [ ] API contracts for auth/invites/billing/job-seeker credits are current
- [ ] End-to-end happy paths verified with Postman or frontend staging
- [ ] UAT smoke checklist executed and signed off
- [ ] Release runbook validated (`docs/release-runbook.md`)

Evidence:
- 

---

## Final Go/No-Go Decision
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

---

## Recommended Closeout Order
1. Security/authz + billing gates
2. Webhook idempotency gates
3. CI/CD enforcement gates
4. Observability gates
5. Frontend/UAT signoff

## Stop-Ship Conditions
- Any money-path duplication risk (credits/subscriptions)
- Any privilege-escalation path in role-protected routes
- Any untraceable P0 failure in auth/billing/webhooks
- Any failing release smoke chain in CI

