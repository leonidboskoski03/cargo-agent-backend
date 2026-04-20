---
title: Sprint 001 - Billing Authz and Entitlements
doc_type: sprint
status: active
owner: backend-platform
created: 2026-04-20
updated: 2026-04-20
summary: Tactical execution plan and status for billing authorization and entitlement hardening.
related_docs:
  - docs/delivery/roadmap.md
  - docs/release/mvp-readiness.md
  - docs/delivery/task-log.md
source_of_truth: true
---

# Sprint 001 - Billing Authz and Entitlements

## Sprint snapshot

- Sprint focus: billing authorization and DB-backed entitlement enforcement.
- Current state: `PARTIAL`.
- Owner: `backend-platform`.
- Last consolidated update: 2026-04-17.

## Goal

Ensure only authorized company admins can mutate billing/subscription state and ensure plan/usage limits are enforced from database truth.

## Scope

- `src/modules/subscriptions/subscriptions.routes.ts`
- `src/modules/billing/billing.routes.ts`
- `src/shared/middleware/requirePlanFeature.middleware.ts`
- `src/shared/middleware/enforceUsageLimit.middleware.ts`
- `src/shared/billing/usage.service.ts`
- Integration tests around billing authz and usage limits

## Work items table

| ID | Work item | Status | Notes |
|---|---|---|---|
| S1-01 | Enforce `COMPANY_ADMIN` on billing/subscription mutation routes | PARTIAL | Route-level protections implemented; final protected-endpoint sweep remains. |
| S1-02 | Replace permissive plan checks with DB-backed entitlement resolution | PARTIAL | Middleware resolves from DB; bypass checks still need final boundary verification. |
| S1-03 | Stabilize usage counter semantics (monthly windows) | PARTIAL | Upsert/month-key behavior present; transition/concurrency edge verification remains. |

## Blockers

- Final edge-window verification for usage counters.
- Final end-to-end authorization sweep across protected billing endpoints.

## Completed outcomes

- Subscription/billing write routes have admin role protections.
- Plan feature and usage-limit middleware no longer rely on spoofable request headers.
- Monthly period-key based usage counter path is implemented.

## Exit condition

Sprint 001 exits when all Sprint 001 work items are `DONE` and linked evidence for billing-authz + entitlement boundaries is attached to release docs.

## Interpretation note

`DONE` at work-item level means tactical completion only; it does not automatically close MVP release blockers.

## Next actions

- Execute final integration boundary tests for month transitions/concurrency.
- Record endpoint-by-endpoint authz verification evidence in release packet.
- Close remaining Sprint 1 items through release evidence linkage.
