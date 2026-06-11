---
title: Cargo Agent Implementation Status
doc_type: implementation-status
status: active
owner: backend-platform
created: 2026-04-19
updated: 2026-06-08
summary: Factual snapshot of what is implemented, partial, missing, and risky for MVP closeout.
related_docs:
  - docs/context/product-context.md
  - docs/context/architecture.md
  - docs/contracts/api/
  - docs/release/mvp-readiness.md
  - docs/release/uat-smoke-checklist.md
  - docs/release/evidence-map.md
  - docs/release/go-no-go.md
source_of_truth: true
---

# Cargo Agent Implementation Status

## 1) Overall system status summary

- Overall backend status: `PARTIAL`.
- Core platform domains are implemented across marketplace, operations, identity/security, billing, and platform services.
- Many domains are functionally complete but remain `PARTIAL` under release rules until evidence and UAT/signoff are closed.
- API contract normalization is complete. `docs/contracts/api/*` is now the canonical contract source.
- Release closeout is incomplete due to open manual UAT and cross-functional signoff.
- Current release decision: `NO-GO` until blockers in `docs/release/mvp-readiness.md` are closed.

## 2) Capability matrix by domain

| Area | State | Source of truth | Notes | Risk level |
|---|---|---|---|---|
| Companies | PARTIAL | `docs/context/architecture.md`, `docs/contracts/api/companies.md` | Core company and membership surface exists; release validation remains open. | Medium |
| Users | PARTIAL | `docs/context/architecture.md`, `docs/contracts/api/users.md` | User lifecycle exists; final release evidence not complete. | Medium |
| Fleet / vehicles / licenses | PARTIAL | `docs/context/architecture.md`, `docs/contracts/api/fleet.md` | Domain implementation exists with closeout integration coverage; full production-like UAT evidence pending. | Medium |
| Locations / routes | PARTIAL | `docs/context/architecture.md`, `docs/context/product-context.md` | Route/location model exists; route integrity validation in release/UAT still open. | Medium |
| Transport posts | PARTIAL | `docs/context/architecture.md` | Implemented in marketplace lane; release closeout evidence pending. | Medium |
| Bids | PARTIAL | `docs/context/architecture.md` | Implemented with acceptance flow; release/UAT closure pending. | Medium |
| Contracts | PARTIAL | `docs/context/architecture.md` | Implemented with lifecycle baseline; full UAT evidence pending. | Medium |
| Job posts / job applications | PARTIAL | `docs/context/architecture.md`, `docs/contracts/api/job-applications.md` | Implemented in job-marketplace lane; release validation still open. | Medium |
| Vehicle marketplace | PARTIAL | `docs/contracts/api/vehicle-marketplace.md` | Product-expansion surface for truck/trailer/van sale, rental, and lease listings is implemented with owner workflows; release evidence remains separate from MVP GO gates. | Medium |
| Documents | PARTIAL | `docs/context/architecture.md`, `docs/contracts/api/support-platform.md` | Metadata and local upload-backed document flow exists; S3-compatible transport remains deferred. | Medium |
| Notifications | PARTIAL | `docs/context/architecture.md`, `docs/contracts/api/support-platform.md` | Implemented baseline/event paths with BullMQ-backed notification event queue; full production-like evidence pending. | Medium |
| Audit logs | PARTIAL | `docs/context/architecture.md`, `docs/contracts/api/support-platform.md` | Implemented baseline with closeout integration coverage; manual evidence closure pending. | Medium |
| Plans | PARTIAL | `docs/contracts/api/company-billing-subscriptions.md` | Plan model exists; final release evidence dependencies remain open. | High |
| Subscriptions / billing | PARTIAL | `docs/contracts/api/company-billing-subscriptions.md`, `docs/release/mvp-readiness.md` | Implemented foundation; RB-003 and RB-004 block release closure. | High |
| Job seeker billing | PARTIAL | `docs/contracts/api/job-seeker-billing.md`, `docs/release/mvp-readiness.md` | Implemented wallet/credits/checkout flow; release evidence closure pending. | High |
| Webhook handling | PARTIAL | `docs/release/evidence-map.md`, `docs/release/mvp-readiness.md`, `docs/release/stripe-sandbox-runbook.md` | Idempotency design is implemented; Stripe sandbox runbook and local readiness check exist; complete retained replay evidence remains open (RB-003). | High |
| Auth / OTP / invites | PARTIAL | `docs/contracts/api/auth.md`, `docs/contracts/api/company-invites.md`, `docs/release/mvp-readiness.md` | Functionally complete; simulated OTP delivery and placeholder invite delivery require explicit MVP acceptance or production provider cutover. | High |
| Entitlements / authz | PARTIAL | `docs/contracts/api/company-billing-subscriptions.md`, `docs/release/mvp-readiness.md` | Enforcement baseline exists; release-grade proof/edge validation remains open. | High |
| Release / CI / observability | PARTIAL | `docs/release/runbook.md`, `docs/release/evidence-map.md`, `docs/release/mvp-readiness.md`, `docs/release/ci-branch-protection-proof.md` | CI uses the active split Prisma schema path; gate evidence and approver signoff still incomplete. | High |

## 3) Current implementation state per area

Implemented:

- Dual-lane domain surface (company logistics + job marketplace) is implemented at backend level.
- Company operations domains (companies/users/fleet/routes) are implemented at baseline.
- Transport marketplace domains (posts/bids/contracts) are implemented at baseline.
- Vehicle marketplace domain is being added as a product-expansion surface; it must not be treated as release GO evidence by itself.
- Platform services (documents/notifications/audit logs) are implemented at baseline.
- Local upload-backed media/document flow is implemented for staging/dev; S3-compatible upload transport is still deferred.
- BullMQ/Redis-backed queues are implemented for Stripe webhooks and notification events; scheduled cleanup remains node-cron initiated.
- Maintenance cron jobs now perform real cleanup/reconciliation work for OTPs, sessions, stale checkout sessions, subscription downgrades/reconciliation, and marketplace expiry paths.
- API contract system is normalized under `docs/contracts/api/*`.
- Closeout integration coverage now covers fleet, billing authorization, support platform, and reviews for frontend-facing Stage 4-6 routes.

Partial:

- Release closure evidence across UAT, billing/webhooks, and CI enforcement.
- Final proof of release-grade authz/entitlements completeness.
- Production provider cutover for OTP and invite outbound delivery, unless explicitly accepted as MVP simulation.

Missing:

- No major required domain is marked `MISSING` at implementation level.
- Release proof set remains incomplete (`RB-001` through `RB-006` not all closed).

## 4) Known gaps

- UAT checklist still has open manual items in `docs/release/uat-smoke-checklist.md`.
- Billing/webhook replay evidence is incomplete for release closure (`RB-003`).
- CI required-check enforcement proof is incomplete (`RB-004`); CI now uses `prisma/schema`, but GitHub branch protection evidence still must be captured.
- OTP delivery remains simulated and invite outbound delivery remains placeholder; if unacceptable for MVP, release must remain `NO-GO`.
- Stripe sandbox proof now has a runbook and local readiness command, but retained Stripe test event IDs are still required.
- S3-compatible upload storage is not implemented; local upload is acceptable only for dev/staging.
- Truth-alignment follow-ups remain open for known contract/code mismatches documented in canonical contracts (auth logout semantics, subscription cancel reason payload handling, job seeker packs query parsing).
- Backend automation evidence has improved for fleet/support/reviews, but manual UAT and external artifacts are still required for GO.

## Release blockers (MVP)

- `RB-001`: Manual UAT completion and validation evidence.
- `RB-002`: Final Product/QA/Ops signoff.
- `RB-003`: Complete billing/webhook replay evidence.
- `RB-004`: CI required-check proof and enforcement validation.
- `RB-005`: Contract source-of-truth adoption verification.
- `RB-006`: OTP/invite outbound delivery-mode decision or provider validation.

## 5) Known risks

- Money-path risk if webhook replay/reconciliation evidence remains incomplete at release time.
- Authorization risk if entitlement and role/tenant enforcement is partial in any protected route.
- Release risk from incomplete manual evidence/signoff despite automated green suites.
- Delivery-provider risk: simulated OTP and placeholder invite delivery may be unacceptable in production policy contexts.
- Documentation drift risk if implementation diverges from canonical contracts in `docs/contracts/api/*`.
- Semantics risk if known contract/code mismatches are not triaged into explicit accept/fix decisions before release closeout.

## Confidence level

Overall confidence in MVP readiness: `LOW`

Reason:

- Core flows exist but are not fully validated in a production-like environment.
- Evidence and signoff are incomplete.
- High-risk areas (billing, webhooks, authz, delivery-provider readiness) remain partial.

## 6) Dependencies and open decisions

Dependencies:

- Stable Stripe staging/test webhook configuration and captured evidence IDs.
- CI required-check configuration evidence from repository settings.
- Staging parity for API + worker + DB migration state.
- Decision on whether simulated OTP and placeholder invite delivery are accepted for MVP release.

Open decisions:

- Final Product/QA/Ops approver assignments and signoff process ownership.
- If simulation is not accepted: production OTP/invite delivery provider cutover scope and timeline.

## 7) What changed recently

- 2026-04-17: Observability baseline marked DONE with request/job correlation logging.
- 2026-04-17: CI workflow and release smoke automation added; tracked as PARTIAL pending complete external evidence.
- 2026-04-19: API contracts normalized into `docs/contracts/api/*` as canonical source.
- 2026-04-20: Release docs normalized under `docs/release/*` with centralized gate/evidence/UAT/go-no-go control.
- 2026-04-20: Capability matrix expanded to full platform reality map (domain + release readiness).
- 2026-04-20: Canonical contract truth-alignment pass completed for auth, company invites, company billing/subscriptions, job seeker billing, and job applications.
- 2026-06-06: Added closeout integration coverage for fleet, support platform, and reviews; added canonical contracts for fleet, support platform, and reviews.
- 2026-06-07: Added vehicle marketplace contract scope for truck/trailer/van listings and inquiries as product expansion, not release GO evidence.
- 2026-06-08: Added Stripe sandbox runbook/check command, CI branch-protection proof guide, local upload contract truth alignment, and documented BullMQ/Redis queue coverage.

## Interpretation rule

- `DONE` means fully implemented and verified through release/UAT evidence.
- `PARTIAL` means implemented but not fully validated or still carrying risk.
- `MISSING` means required for MVP but not implemented or not validated at all.
- If unsure, classify capability as `PARTIAL` or `RISK`.

## 8) Related docs

- `docs/README.md`
- `docs/context/product-context.md`
- `docs/context/architecture.md`
- `docs/contracts/api/` (canonical API contract source)
- `docs/release/mvp-readiness.md`
- `docs/release/runbook.md`
- `docs/release/evidence-map.md`
- `docs/release/uat-smoke-checklist.md`
- `docs/release/go-no-go.md`
