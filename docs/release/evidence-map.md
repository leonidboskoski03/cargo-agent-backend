---
title: Release Evidence Map
doc_type: release-evidence-map
status: active
owner: release-owner
created: 2026-04-20
updated: 2026-06-09
summary: Table-driven mapping of release gates to proof artifacts and pass criteria.
related_docs:
  - docs/release/mvp-readiness.md
  - docs/release/runbook.md
  - docs/release/uat-smoke-checklist.md
  - docs/release/go-no-go.md
  - docs/release/stripe-sandbox-runbook.md
  - docs/release/ci-branch-protection-proof.md
source_of_truth: true
---

# Release Evidence Map

Use this file to prove each release gate.
Do not record verdicts here; record verdicts in `docs/release/go-no-go.md`.

Allowed status values: `NOT STARTED`, `PARTIAL`, `PROVEN`, `FAILED`.

| Gate ID | Gate / Check | Owner | Current status | Execution action | Pass criteria | Evidence required | Blocker ref |
|---|---|---|---|---|---|---|---|
| G-001 | Manual UAT completion | QA (TBD) | PARTIAL | Execute all checks in `docs/release/uat-smoke-checklist.md` | All required checklist items marked PASS | Completed checklist with run date, executor, and links; backend automation assist: `tests/integration/fleetCloseout.spec.ts`, `tests/integration/supportCloseout.spec.ts`, `tests/integration/billingPlans.spec.ts` | RB-001 |
| G-002 | Cross-functional signoff | Product/QA/Ops/Backend (TBD) | NOT STARTED | Collect signoffs after gate review | Product, QA, Ops, Backend signoffs present | Signed approval record in UAT/go-no-go docs | RB-002 |
| G-003 | Billing/webhook replay proof | Backend (TBD) | PARTIAL | Run replay/idempotency validation scenarios from `docs/release/stripe-sandbox-runbook.md` | No duplicate money-path mutation under replay | Automated replay tests plus Stripe/staging event IDs and outputs; current automated evidence includes `tests/integration/billingWebhookLifecycle.spec.ts`, `tests/integration/subscriptionWebhookLifecycle.spec.ts`, `tests/integration/jobSeekerWebhookIdempotency.spec.ts`, local readiness command `npm run stripe:sandbox:check`, `docs/release/evidence/2026-06-08/stripe/README.md`, and `docs/release/evidence/2026-06-09/stripe/README.md`; real event IDs still need to be recorded in `docs/release/evidence/2026-06-09/stripe/manual-stripe-smoke.md` | RB-003 |
| G-004 | CI required-check enforcement | Ops/Backend (TBD) | PARTIAL | Validate branch protection required checks block failing merges using `docs/release/ci-branch-protection-proof.md` | Failing required checks block merge | Screenshots/links showing required checks + blocked merge case; code now uses active split Prisma schema path in CI migration deploy | RB-004 |
| G-005 | Contract source-of-truth adoption verification | Backend (TBD) | PARTIAL | Validate active docs reference `docs/contracts/api/*` as canonical, legacy contracts are treated as archived history under `docs/archive/2026/contracts/`, and frontend-used modules are aligned | All active docs reference canonical contract source with no primary-source conflicts and documented mismatch triage state | Canonical contracts now include auth, company invites, billing/subscriptions, job seeker billing, job applications, plans, users, companies, fleet, support platform, and reviews | RB-005 |
| G-006 | OTP/invite outbound delivery readiness decision | Product/Ops/Security (TBD) | NOT STARTED | Execute delivery-mode review and select waiver or provider-cutover path | Either: (A) signed MVP waiver explicitly accepting simulated OTP + placeholder invite email, or (B) production provider flows validated end-to-end | Decision record in `docs/release/go-no-go.md` + UAT evidence links (`UAT-AUTH-005`, `UAT-INV-004`) | RB-006 |

## Evidence recording format

- Use stable evidence names with date and gate ID.
- Link each artifact directly from this map row.
- If evidence is unavailable, mark gate as `FAILED`.

## Notes

- Gate status is evaluated during runbook execution in `docs/release/runbook.md`.
- Final release verdict is recorded only in `docs/release/go-no-go.md`.

## Backend automation evidence added on 2026-06-06

- Added `tests/integration/fleetCloseout.spec.ts` for vehicle/license/assignment CRUD, delete/restore, driver read-only behavior, admin mutation behavior, and assignment overlap rejection.
- Added `tests/integration/supportCloseout.spec.ts` for notification read state, document ownership/restore behavior, audit-log admin filtering, and review lifecycle/tenant visibility.
- Existing billing evidence retained in `tests/integration/billingPlans.spec.ts`, including company-driver mutation denial and provider-not-configured behavior.
- Added canonical contracts for `docs/contracts/api/fleet.md`, `docs/contracts/api/support-platform.md`, and `docs/contracts/api/reviews.md`.
- These improve backend automation and contract evidence, but they do not close manual UAT, cross-functional signoff, external CI enforcement proof, Stripe event artifact capture, or OTP/invite delivery-mode decision gates.

## Operational readiness support added on 2026-06-08

- Added `docs/release/stripe-sandbox-runbook.md` for test-mode Stripe setup, webhook forwarding, event capture, and replay evidence collection.
- Added `npm run stripe:sandbox:check` to print local Stripe key, webhook signature, plan price, and credit-pack price readiness.
- Added `GET /api/v1/billing/readiness` for non-secret Stripe/queue/price readiness booleans.
- Added `docs/release/ci-branch-protection-proof.md` for the required-check and blocked-merge evidence checklist.
- Updated CI migration deploy to use the active split Prisma schema path (`prisma/schema`).
- Documented that BullMQ/Redis is real for `billing_webhooks` and `notification_events`, while cron cleanup jobs remain scheduler-driven.
- Documented that local uploads are implemented and S3-compatible upload transport remains deferred.
- These are supporting artifacts only. They do not close `RB-003`, `RB-004`, or `RB-006` without real Stripe event IDs, GitHub branch protection proof, and delivery-provider evidence or signed waiver.

## Stripe evidence support added on 2026-06-09

- Captured `docs/release/evidence/2026-06-09/stripe/stripe-sandbox-check.txt`.
- Captured `docs/release/evidence/2026-06-09/stripe/webhook-replay-tests.txt`.
- Added `docs/release/evidence/2026-06-09/stripe/manual-stripe-smoke.md` for real Stripe checkout session IDs, webhook event IDs, and wallet/subscription verification notes.
- `G-003` remains `PARTIAL` until real Stripe Dashboard/CLI event IDs and manual smoke results are recorded.
