---
title: Cargo Agent Architecture
doc_type: architecture
status: active
owner: backend-platform
created: 2026-04-19
updated: 2026-04-20
summary: Living architecture reference for Cargo Agent backend covering boundaries, critical flows, integrations, and release-hardening posture.
related_docs:
  - docs/README.md
  - docs/context/product-context.md
  - docs/context/implementation-status.md
  - docs/contracts/api/
  - docs/delivery/roadmap.md
  - docs/release/mvp-readiness.md
source_of_truth: true
---

# Cargo Agent Architecture

## 1) Architecture snapshot

Cargo Agent is a modular monolith with two runtimes:

- API runtime in `src/server.ts` for synchronous HTTP request/response behavior.
- Worker runtime in `src/worker.ts` for queue-driven asynchronous processing.

Code is organized by feature modules under `src/modules/*` and shared cross-cutting infrastructure under `src/shared/*`. Public API routing is versioned through `src/routes/v1.ts` under `/api/v1`.

Architecture scope note:

- Current architecture commitments cover implemented backend surfaces (marketplace lanes, auth/invite/security, billing/credits, and release-hardening controls).
- Future ERP/analytics expansions described in product vision are not architectural commitments in this file until explicitly promoted into active architecture docs.

## 2) Backend stack

- Node.js, Express, TypeScript
- PostgreSQL + Prisma ORM
- Zod request validation at route boundaries
- JWT access tokens + refresh-session persistence + cookie transport
- Stripe for checkout, subscriptions, and webhook events
- BullMQ + Redis for async/retryable job processing
- node-cron for periodic background tasks
- Pino structured logging with request/job correlation fields

## 3) Module boundaries

Primary boundaries:

- `src/modules/*`: business capabilities (companies, users, vehicles/fleet, routes/locations, posts/bids/contracts, job applications/submissions, auth, invites, billing/subscriptions, job-seeker billing, notifications, documents, audit logs, webhooks).
- `src/shared/*`: middleware, auth helpers, queue/stripe/prisma clients, error handling, and shared policy helpers.

Service layering:

- `routes -> controller -> service -> repository`

Boundary rules:

- Services enforce business invariants and state-transition rules.
- Repositories handle persistence and query behavior.
- Validation is required before service execution.

## 4) Domain areas

### Company lane (tenant-scoped logistics marketplace)

- Core entities: companies, company users/roles, memberships, invites.
- Operations entities: fleet/vehicles, vehicle assignments, licenses, routes/locations, company documents.
- Marketplace entities: transport posts, bids, contracts/jobs, reviews.
- Billing entities: plans, subscriptions, checkout sessions, usage counters, billing events.
- Route usage: routes are operational business objects used in planning, matching, and execution context.

### Job seeker lane (independent user scope)

- Core entities: independent users with `JOB_SEEKER` role and profile completion surface.
- Marketplace entities: company job posts (`JobApplication`) and candidate submissions (`JobApplicationSubmission`).
- Monetization entities: job seeker wallet, credit transactions, credit packs, usage counters, checkout sessions.
- Boundary: no company-lane transport post/bid/contract authority and no company subscription authority.

### Shared platform capabilities

- Identity/authentication: sessions, OTP, password-reset/change, token invalidation.
- Cross-cutting resources: users, documents, notifications, audit logs.
- Platform services: shared observability, error handling, rate limiting, queue/workers, billing webhook ingestion.

### Non-negotiable architectural invariants

- Money-path side effects must be replay-safe and idempotent.
- Tenant scope must never leak across company boundaries.
- Job seeker and company capabilities must remain isolated by backend authorization.
- Session and OTP flows must reject stale or replayed credentials.
- Critical state transitions must be explicit and auditable.
- Route/post/bid/contract transitions must preserve workflow integrity (`post -> bid -> accepted bid -> contract`).
- Role boundaries must be enforced server-side for billing authority and membership mutation flows.

## 5) Auth/session model

Auth is hybrid stateless/stateful:

- Short-lived access JWT carries authorization context.
- Refresh sessions are persisted (`AuthSession`) with revocation and expiry lifecycle.
- Token-version/session-snapshot checks invalidate stale credential contexts.
- OTP challenges (`AuthOtpChallenge`) are purpose-scoped and lifecycle-scoped.
- Password reset/change flows require session invalidation semantics.

Security requirements:

- OTP must enforce expiry, attempt limits, resend cooldown, and single-use.
- Session flows must support current-session revoke, global revoke, and stale token rejection.
- Auth checks must enforce both role and tenant scope, not role only.
- Password reset/change must invalidate prior credential contexts through session/token-version controls.

## 6) Billing and webhook architecture

Billing is webhook-driven by design:

- Application endpoints create checkout/subscription intents.
- Stripe webhook events are the canonical source for final billing state transitions.
- Webhook processing supports queue-backed execution and retry semantics.
- Billing event persistence enforces idempotency for duplicate/replayed provider events.

Money-path guarantees:

- The same provider event must not produce duplicate subscription or credit side effects.
- Billing mutations are restricted to authorized company-admin scope.
- Entitlements and usage enforcement must resolve from database state, not client-provided hints.
- Job seeker credit mutations must be ledger-backed and replay-safe under webhook retry/replay conditions.

## 7) Invite and company membership architecture

Invite and membership flows are lifecycle-bound:

- Company admin creates invite with target email and target role.
- Invite lifecycle is controlled (`PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED`).
- Acceptance validates token integrity, invite status, expiry, and recipient identity.
- OTP-gated acceptance may be required by flow policy.
- Membership linkage and role assignment are applied transactionally.

Architecture intent:

- User identity remains account-centric.
- Company linkage is explicit, controlled, and auditable.

## 8) Release and observability considerations

Architecture-level observability requirements:

- Request and worker logs must contain correlation identifiers for traceability.
- Security-critical and money-critical transitions must be observable in logs/audit records.
- Health/readiness endpoints must reflect API and dependency availability.
- Queue/job processing must provide visibility into retries/failures.

Release docs define gate execution and evidence policy; this file defines required architecture characteristics.

Boundary note:

- Release-control architecture is active (runbook/evidence/UAT/go-no-go), while release decisions remain governed by `docs/release/mvp-readiness.md` and `docs/release/go-no-go.md`.

## 9) External integrations

- Stripe: checkout, subscriptions, portal, webhook events.
- Redis: BullMQ queue backend.
- PostgreSQL: system of record.
- OTP/invite delivery adapters: provider-agnostic interfaces with simulation-capable behavior.

Open point:

- Production provider wiring for OTP/invite outbound delivery is environment-dependent and must be verified in release/ops docs.

## 10) Risks and architectural pressure points

- Webhook replay and partial-failure handling on money-path transitions.
- Role/tenant isolation regressions across company and job-seeker boundaries.
- Route/post/bid/contract transition integrity regressions across service boundaries.
- Auth hardening drift (session invalidation, stale credential rejection) across environments.
- Contract drift if implementation diverges from canonical `docs/contracts/api/*`.
- Coupling pressure as modular monolith scope expands.
- Scope creep risk if future ERP/analytics ideas are treated as current architecture commitments.

Risk-control principle:

- Prefer explicit, test-backed state transitions and idempotent operations over implicit behavior.

## 11) Related docs

- `docs/README.md`
- `docs/context/product-context.md`
- `docs/context/implementation-status.md`
- `docs/contracts/api/` (canonical API contract source)
- `docs/delivery/roadmap.md`
- `docs/release/mvp-readiness.md`
- `docs/release/go-no-go.md`
