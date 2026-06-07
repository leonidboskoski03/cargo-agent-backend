---
title: Release Evidence Map
doc_type: release-evidence-map
status: active
owner: release-owner
created: 2026-04-20
updated: 2026-06-07
summary: Table-driven mapping of release gates to proof artifacts and pass criteria.
related_docs:
  - docs/release/mvp-readiness.md
  - docs/release/runbook.md
  - docs/release/uat-smoke-checklist.md
  - docs/release/go-no-go.md
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
| G-003 | Billing/webhook replay proof | Backend (TBD) | PARTIAL | Run `npm run test:evidence:webhooks` and capture Stripe staging replay artifacts | No duplicate money-path mutation under replay | Automated replay command now writes dated artifacts under `docs/release/evidence/<date>/G-003-webhook-replay/`; specs: `tests/integration/billingWebhookLifecycle.spec.ts`, `tests/integration/subscriptionWebhookLifecycle.spec.ts`, `tests/integration/jobSeekerWebhookIdempotency.spec.ts`; still requires Stripe/staging event IDs and retained outputs for `PROVEN` | RB-003 |
| G-004 | CI required-check enforcement | Ops/Backend (TBD) | PARTIAL | Validate branch protection required checks block failing merges | Failing required checks block merge | Screenshots/links showing required checks + blocked merge case | RB-004 |
| G-005 | Contract source-of-truth adoption verification | Backend (TBD) | PROVEN | Run `npm run test:evidence:contracts` | All active MVP backend modules in `docs/release/backend-coverage-matrix.md` reference existing canonical contract files and are marked covered or explicitly frontend-deferred | Automated artifact: `docs/release/evidence/2026-06-07/G-005-contract-adoption/manifest.json`; summary: `docs/release/evidence/2026-06-07/G-005-contract-adoption/summary.md`; canonical matrix: `docs/release/backend-coverage-matrix.md` | RB-005 |
| G-006 | OTP/invite outbound delivery readiness decision | Product/Ops/Security (TBD) | PARTIAL | Execute delivery-mode review and select provider-cutover path | Production provider flows validated end-to-end | Provider-backed email adapter, `/api/v1/delivery/status`, frontend `/release-readiness`, and provider unit coverage are implemented; still requires configured provider UAT evidence links (`UAT-AUTH-005`, `UAT-INV-004`) and decision record update | RB-006 |

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
- These improve backend automation, contract evidence, media upload transport, and delivery-provider readiness, but they do not close manual UAT, cross-functional signoff, external CI enforcement proof, Stripe event artifact capture, or configured OTP/invite provider validation.

## Backend evidence added on 2026-06-06 release-hardening pass

- Added `npm run test:evidence:webhooks` as the repeatable automated replay proof command for company subscription, company checkout, invoice, and job seeker credit webhook idempotency.
- Fixed and documented `POST /api/v1/subscriptions/cancel-at-period-end` reason handling through audit payload `SUBSCRIPTION_CANCEL_AT_PERIOD_END_REQUESTED`.
- Fixed and documented `GET /api/v1/job-seeker-billing/packs` boolean query parsing with validated `true/false/1/0/yes/no` support.
- Added explicit mismatch triage states in `docs/contracts/api/auth.md`, `docs/contracts/api/company-billing-subscriptions.md`, and `docs/contracts/api/job-seeker-billing.md`.
- Gate status remains `PARTIAL` until required external artifacts and approvals are attached.

## Release closure support added on 2026-06-06 product-polish pass

- Implemented S3-compatible SigV4 upload transport behind `POST /api/v1/documents/upload`, while keeping local storage as dev/test fallback.
- Added unit evidence for delivery provider status/sending and local/S3 upload behavior.
- Changed `npm run test:evidence:webhooks` to write dated replay manifests and terminal output under `docs/release/evidence/`.
- Added `scripts/release-smoke.ps1` for health/direct-route smoke artifacts and frontend `/release-readiness` for admin-visible provider state.
- Gate status remains `PARTIAL`; real Stripe event IDs, CI enforcement proof, manual UAT, delivery-provider UAT, and signoff are still external evidence requirements.

## Contract adoption evidence added on 2026-06-07

- Added `npm run test:evidence:contracts` as a repeatable audit for `G-005`.
- The audit reads `docs/release/backend-coverage-matrix.md`, verifies every referenced canonical contract exists under `docs/contracts/api/`, and fails if a module lacks a contract reference or covered status.
- Latest artifact: `docs/release/evidence/2026-06-07/G-005-contract-adoption/manifest.json`.
- `G-005` is now `PROVEN`; release remains `NO-GO` until manual UAT, signoff, Stripe event IDs, CI enforcement proof, and delivery-provider validation are attached.
