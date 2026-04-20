---
title: Sprint 002 - Webhooks, OTP, and Invite Hardening
doc_type: sprint
status: active
owner: backend-platform
created: 2026-04-20
updated: 2026-04-20
summary: Tactical execution plan and status for webhook replay safety and auth challenge hardening.
related_docs:
  - docs/delivery/roadmap.md
  - docs/release/mvp-readiness.md
  - docs/delivery/task-log.md
source_of_truth: true
---

# Sprint 002 - Webhooks, OTP, and Invite Hardening

## Sprint snapshot

- Sprint focus: money-path replay safety and identity-flow abuse resistance.
- Current state: `PARTIAL`.
- Owner: `backend-platform`.
- Last consolidated update: 2026-04-17.

## Goal

Ensure webhook processing is replay-safe and auth challenge/invite flows enforce lifecycle correctness under abuse and edge conditions.

## Scope

- `src/modules/webhooks/webhooks.service.ts`
- `src/modules/webhooks/webhooks.repository.ts`
- `src/modules/auth/auth.service.ts`
- `src/modules/auth/auth.otpDelivery.ts`
- `src/modules/companyInvites/companyInvites.service.ts`
- Integration suites for webhook lifecycle, release smoke, auth OTP flows, and invite acceptance

## Work items table

| ID | Work item | Status | Notes |
|---|---|---|---|
| S2-01 | Expand webhook idempotency coverage for duplicate/replayed Stripe events | PARTIAL | Exactly-once behavior patterns are in place; final replay evidence bundle remains open. |
| S2-02 | Harden OTP lifecycle (expiry, attempts, lockout, resend, single-use) | PARTIAL | Endpoints and rate-limit controls exist; final abuse-case matrix verification remains. |
| S2-03 | Harden company invite acceptance lifecycle | DONE | Wrong-user, expired/revoked/used invite checks and OTP consumption protections are covered. |

## Blockers

- Final replay stress evidence for webhook processing.
- Final OTP abuse/edge-case verification evidence for release packet.

## Completed outcomes

- Invite acceptance lifecycle hardening completed with key negative-path coverage.
- Webhook idempotency/replay-safe handling implemented in service/repository flow.
- OTP request/verify/resend flow implemented with dedicated protection middleware.

## Exit condition

Sprint 002 exits when webhook replay evidence and OTP abuse-matrix evidence are both linked in release docs and remaining Sprint 002 work items are `DONE`.

## Interpretation note

`DONE` at work-item level means tactical completion only; it does not automatically close MVP release blockers.

## Next actions

- Capture replay/no-duplicate mutation evidence with retained Stripe event IDs.
- Complete OTP abuse matrix verification and attach artifacts.
- Close remaining Sprint 2 items in release readiness tracker.
