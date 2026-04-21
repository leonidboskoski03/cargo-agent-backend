---
title: Release Evidence Map
doc_type: release-evidence-map
status: active
owner: release-owner
created: 2026-04-20
updated: 2026-04-20
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
| G-001 | Manual UAT completion | QA (TBD) | PARTIAL | Execute all checks in `docs/release/uat-smoke-checklist.md` | All required checklist items marked PASS | Completed checklist with run date, executor, and links | RB-001 |
| G-002 | Cross-functional signoff | Product/QA/Ops/Backend (TBD) | NOT STARTED | Collect signoffs after gate review | Product, QA, Ops, Backend signoffs present | Signed approval record in UAT/go-no-go docs | RB-002 |
| G-003 | Billing/webhook replay proof | Backend (TBD) | PARTIAL | Run replay/idempotency validation scenarios | No duplicate money-path mutation under replay | Test/run artifacts with Stripe event IDs and outputs | RB-003 |
| G-004 | CI required-check enforcement | Ops/Backend (TBD) | PARTIAL | Validate branch protection required checks block failing merges | Failing required checks block merge | Screenshots/links showing required checks + blocked merge case | RB-004 |
| G-005 | Contract source-of-truth adoption verification | Backend (TBD) | PARTIAL | Validate active docs reference `docs/contracts/api/*` as canonical, legacy contracts are treated as archived history under `docs/archive/2026/contracts/`, and key module contracts (auth, company invites, company billing/subscriptions, job seeker billing, job applications) are aligned | All active docs reference canonical contract source with no primary-source conflicts and documented mismatch triage state | Doc reference audit notes/links | RB-005 |
| G-006 | OTP/invite outbound delivery readiness decision | Product/Ops/Security (TBD) | NOT STARTED | Execute delivery-mode review and select waiver or provider-cutover path | Either: (A) signed MVP waiver explicitly accepting simulated OTP + placeholder invite email, or (B) production provider flows validated end-to-end | Decision record in `docs/release/go-no-go.md` + UAT evidence links (`UAT-AUTH-005`, `UAT-INV-004`) | RB-006 |

## Evidence recording format

- Use stable evidence names with date and gate ID.
- Link each artifact directly from this map row.
- If evidence is unavailable, mark gate as `FAILED`.

## Notes

- Gate status is evaluated during runbook execution in `docs/release/runbook.md`.
- Final release verdict is recorded only in `docs/release/go-no-go.md`.
