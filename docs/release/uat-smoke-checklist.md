---
title: UAT Smoke Checklist
doc_type: uat-smoke-checklist
status: active
owner: qa-owner
created: 2026-04-20
updated: 2026-06-06
summary: Manual MVP smoke validation checklist grouped by user and release-critical flows.
related_docs:
  - docs/release/mvp-readiness.md
  - docs/release/runbook.md
  - docs/release/evidence-map.md
  - docs/release/go-no-go.md
source_of_truth: true
---

# UAT Smoke Checklist

Use this file for manual validation only.
Use `docs/release/evidence-map.md` for gate proof mapping and `docs/release/go-no-go.md` for final verdict logging.

## Run metadata

- Run date:
- Environment:
- Executor:
- Build/version:

## Auth and session flows

- [ ] `UAT-AUTH-001` Register/login/logout flow works end-to-end.
- [ ] `UAT-AUTH-002` Refresh session flow works and stale credentials are rejected.
- [ ] `UAT-AUTH-003` Forgot/reset/change password flow works and invalidates old sessions.
- [ ] `UAT-AUTH-004` OTP request/verify/resend lifecycle works with expected restrictions.
- [ ] `UAT-AUTH-005` OTP outbound mode is explicitly validated as acceptable for MVP (signed waiver) or proven with production delivery provider evidence.

## Company invites and membership

- [ ] `UAT-INV-001` Company invite create flow works for authorized role.
- [ ] `UAT-INV-002` Invite accept works only for intended user.
- [ ] `UAT-INV-003` Expired/revoked/used invite cases are blocked.
- [ ] `UAT-INV-004` Invite outbound email mode is explicitly validated as acceptable for MVP (signed waiver) or proven with production provider evidence.

## Billing and subscription flows

- [ ] `UAT-BILL-001` Billing/subscription mutation endpoints reject unauthorized roles.
- [ ] `UAT-BILL-002` Checkout/subscription happy path works.
- [ ] `UAT-BILL-003` Usage/entitlements enforcement matches expected plan behavior.

## Fleet operations

- [ ] `UAT-FLEET-001` Admin creates, edits, deletes, and restores a vehicle.
- [ ] `UAT-FLEET-002` Admin creates, edits, deletes, and restores a driver license.
- [ ] `UAT-FLEET-003` Admin assigns a vehicle to a company driver and overlapping assignment attempts are rejected.
- [ ] `UAT-FLEET-004` Company driver can view fleet context but cannot mutate vehicles, licenses, or assignments.

## Support platform and reviews

- [ ] `UAT-SUP-001` User lists notifications and marks one/all as read.
- [ ] `UAT-SUP-002` Admin creates, deletes, and restores document metadata; driver cannot mutate documents.
- [ ] `UAT-SUP-003` Admin lists audit logs and filters by actor/action; driver access is rejected.
- [ ] `UAT-SUP-004` Admin creates, updates, publishes/withdraws, deletes, and restores a review for a completed contract.
- [ ] `UAT-SUP-005` Draft review visibility and cross-tenant review access are scoped correctly.

## Webhook and replay safety

- [ ] `UAT-WEB-001` Webhook processing success path updates expected state.
- [ ] `UAT-WEB-002` Replay/duplicate webhook does not create duplicate money-path side effects.
- [ ] `UAT-WEB-003` Replay evidence artifacts are linked for gate `G-003`.

## Job seeker billing and credits

- [ ] `UAT-JS-001` Wallet/usage endpoints are role-scoped correctly.
- [ ] `UAT-JS-002` Credit checkout flow works and credits are applied exactly once.
- [ ] `UAT-JS-003` Insufficient-credit behavior returns expected error semantics.

## Operational release checks

- [ ] `UAT-OPS-001` CI required checks are confirmed enforced (gate `G-004` evidence linked).
- [ ] `UAT-OPS-002` Contract source-of-truth adoption verification is confirmed (gate `G-005` evidence linked).
- [ ] `UAT-OPS-003` Delivery-mode decision evidence is linked for gate `G-006` (waiver or provider validation).
- [ ] `UAT-OPS-004` `GET /health/live` returns `200` and is treated as process-liveness only (not dependency readiness).
- [ ] `UAT-OPS-005` `GET /health/ready` returns dependency-aware status (`database`, and `redis` when `BULLMQ_ENABLED=true`) with evidence artifact.
- [ ] `UAT-OPS-006` Worker visibility evidence is captured (worker startup logs and queue-enabled mode documented for the release environment).
- [ ] `UAT-OPS-007` Placeholder cron jobs are explicitly acknowledged as MVP placeholders (or replaced by implemented jobs) in release notes/evidence.

## Result

- UAT result: `PASS / FAIL`
- Evidence links:
- Notes:

Delivery-mode decision record (required):

- OTP delivery mode: `WAIVER_ACCEPTED / PROVIDER_VALIDATED / NOT_DECIDED`
- Invite email mode: `WAIVER_ACCEPTED / PROVIDER_VALIDATED / NOT_DECIDED`
- Decision artifact link(s):

## Signoff

- Product signoff:
- QA signoff:
- Ops signoff:
- Backend signoff:
