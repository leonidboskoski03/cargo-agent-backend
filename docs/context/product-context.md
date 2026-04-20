---
title: Cargo Agent Product Context
doc_type: product-context
status: active
owner: backend-platform
created: 2026-04-17
updated: 2026-04-20
summary: Canonical product/domain brief for Cargo Agent backend and AI-assisted implementation.
related_docs:
  - docs/contracts/api/
  - docs/context/architecture.md
  - docs/context/implementation-status.md
  - docs/delivery/roadmap.md
  - docs/release/mvp-readiness.md
source_of_truth: true
---

# Cargo Agent Product Context

## 1) Project snapshot

Cargo Agent is a dual-marketplace B2B SaaS platform for the Balkans logistics sector:

- logistics marketplace: company-to-company (`company <-> company`)
- job marketplace: company-to-driver/job-seeker (`company <-> job seeker`)

The backend is designed to digitize phone/manual workflows into deterministic, auditable, and monetizable product flows.

As of current MVP hardening:

- Core backend modules are implemented (auth, marketplace, invites, billing foundations, workers).
- Company and job-seeker lanes both exist in API/domain model.
- Release readiness is not GO yet because manual UAT and cross-functional signoff are still open.
- Current engineering mode is production-hardening, not greenfield feature sprawl.

## 2) Product mission

Replace informal, phone-driven brokerage and coordination workflows with a structured digital platform that is:

- operationally reliable (deterministic workflows)
- auditable (traceable business and security events)
- monetizable (subscriptions and credit-based usage)
- scalable for regional growth across Balkan logistics markets

## 3) Core domain entities

- `Company`: tenant boundary for company-side operations, users, billing, and marketplace participation.
- `User`: authenticated identity. May be company-linked or independent, depending on role.
- `Company Admin`: company authority actor for membership, billing/subscription, and invite-controlled onboarding.
- `Company Driver`: company-linked operational user with narrower permissions than admin.
- `Job Seeker`: independent actor for job marketplace participation and credit-based actions.
- `Transport Post`: company-to-company logistics demand/supply listing in the transport marketplace.
- `Bid`: company offer on a transport post; bid acceptance is a contract creation trigger.
- `Contract / Job`: formalized execution object created from accepted marketplace interaction.
- `Company Job Post`: company-published driver hiring listing (implemented in backend as `JobApplication` entity).
- `Job Application`: candidate submission to a company job post (implemented in backend as `JobApplicationSubmission`).
- `Subscription`: company billing state linked to plan and Stripe lifecycle reconciliation.
- `Credit`: job seeker monetization unit tracked via wallet/ledger and consumed by premium/over-quota actions.
- `Route`: reusable business object describing trip intent and constraints (not only location points).

## 4) Route definition

In Cargo Agent, a route is a business object used in transport planning and matching. A route may include:

- origin location
- destination location
- timing window (pickup/delivery dates or expected window)
- price context (target price, negotiated amount, or pricing basis)
- cargo/work context (load type, constraints, or job requirements)

Route integrity expectation: a route must preserve operational meaning for downstream post/bid/contract workflows.

## 5) Business model

Cargo Agent runs two monetization lanes:

- Company lane:
  - plans: `FREE`, `PRO`
  - billing ownership: company-level (not individual users)
  - paid flows: Stripe checkout + webhook-driven subscription state sync
- Job seeker lane:
  - free quota + credit top-ups
  - wallet/usage based actions in job-application workflows
  - Stripe checkout for credit packs

Money-path invariants:

- subscription/credit mutations must be idempotent
- replayed webhooks must not double-apply effects
- role/authorization boundaries on billing routes are mandatory

## 6) Primary actors and roles

- `COMPANY_ADMIN`
  - company-scoped management actor
  - manages billing/subscriptions, invites, and company-side resources
- company team user / dispatcher/driver-style operational role
  - operational actions with narrower permissions than admin
- `JOB_SEEKER`
  - independent lane with profile/applications/credits
  - must not perform company-only marketplace/billing actions
- platform/internal admin (operational support context)
  - not core external marketplace actor for MVP contracts

Role boundaries are a core safety control, not optional UI policy.

## 7) Core flows in MVP

### Company lane (logistics marketplace)

1. Authentication and onboarding
2. Company users and membership controls
3. Post creation
4. Bid submission
5. Bid acceptance to contract creation
6. Contract lifecycle progression
7. Review flow after valid contract lifecycle state

### Job seeker lane

1. Registration/profile completion
2. Job listing discovery and submission flow
3. Free quota consumption and/or credit charging
4. Credit top-up via Stripe checkout

### Security and account lifecycle

- register/login/refresh/logout
- OTP challenge request/verify/resend
- forgot/reset/change password with session invalidation model
- invite acceptance with lifecycle protections

## 8) User roles and permissions

### Company admin

- Manage company membership and role linkage.
- Create/revoke invites and control who joins company scope.
- Perform company billing/subscription actions.
- Manage company-side marketplace and operational resources per API authorization.

### Company driver

- Perform operational company actions explicitly allowed by backend role guards.
- Cannot perform company billing authority actions reserved for company admins.
- Cannot bypass tenant boundaries or mutate company membership authority fields.

### Job seeker

- Manage own profile and job-marketplace participation.
- Submit job applications and use credit-supported features as permitted.
- Cannot perform company-to-company marketplace authority actions.
- Cannot act as company billing authority.

## 9) Monetization model

### Current model (MVP-relevant)

- Company lane: subscription model (`FREE`, `PRO`) with Stripe checkout and webhook reconciliation.
- Job seeker lane: credit-based model with free quota + paid credit top-ups.

### Future model (not MVP)

- Escrow-style/middleman transaction model for managed payment/intermediation flows.
- This is future-only and not an active MVP billing behavior.

## 10) MVP scope (strict boundary)

### Included in MVP

- Auth/session/OTP/password lifecycle with role-aware access controls.
- Company onboarding/invite/membership baseline.
- Company logistics marketplace baseline (`post -> bid -> contract -> review`).
- Job marketplace baseline (company job posts + job seeker applications).
- Company subscription foundations and job seeker credit foundations.
- Release-control artifacts (runbook, evidence map, UAT checklist, go/no-go, readiness).

### Not included in MVP

- Escrow-style transaction intermediation.
- Advanced analytics/BI suites and broad AI reporting products.
- Expanded marketplaces (vehicle, parts, rental, service/maintenance, oil-company network).
- Full real-time suite (tracking/chat/voice) as a complete production surface.

## 11) Current implemented platform surface vs future vision

### Current implemented platform surface

- Dual-lane marketplace foundation exists (company logistics + job seeker lane).
- Auth/session/OTP/invite/billing/webhook systems are implemented and under release hardening.
- Canonical API behavior is documented in `docs/contracts/api/*`.

### Future vision (not current release scope)

- Broader marketplace network expansion and deeper monetization layers.
- AI-assisted reports and advanced analytics products.
- Extended operations stack and richer real-time collaboration features.

## 12) Backend architecture stack and conventions

Stack:

- Node.js + Express
- PostgreSQL + Prisma ORM
- Zod request validation
- JWT + cookie/session model
- Stripe for checkout/webhooks
- BullMQ + Redis for async event processing
- Pino for structured logs and request correlation

Architecture conventions:

- feature modules in `src/modules/*`
- shared infra/utilities in `src/shared/*`
- API process entry in `src/server.ts`
- worker process entry in `src/worker.ts`
- Prisma schema/migrations in `prisma/*`
- integration/unit tests in `tests/*`

Reliability/security conventions:

- centralized error envelope
- OTP attempt/expiry/resend controls
- session revocation/token invalidation support
- webhook idempotency and replay-safe handling
- request/job correlation logging

## 13) Current implementation focus

Current priority is MVP release closure through risk hardening:

- billing authorization and DB-backed entitlements correctness
- webhook idempotency evidence and replay assurance
- OTP/invite lifecycle abuse-case coverage
- CI enforcement and release gate evidence collection
- UAT completion and signoff

Current state summary:

- observability baseline: implemented
- CI workflow + branch protection: configured, evidence artifacts still being finalized
- API contracts: normalized under `docs/contracts/api/*` as canonical source
- legacy contract sources are archived under `docs/archive/2026/contracts/` and are historical-only
- release decision: currently NO-GO pending final manual evidence/signoff

## 14) Constraints and non-goals

Constraints:

- MVP work must protect money-path and auth-path safety first
- no casual contract drift between backend and frontend
- company and job-seeker lanes must stay role-isolated
- archive docs are historical and not implementation input

Non-goals for this phase:

- broad post-MVP feature expansion (advanced analytics, rich admin console, expanded pricing matrix)
- speculative architecture rewrites without release risk reduction
- introducing behavior that bypasses release gates or evidence requirements

## 15) Engineering principles for this project

- Correctness before speed on auth, billing, webhooks, and invite/session flows.
- Enforce business invariants in backend logic, not only in frontend UX.
- Prefer explicit, test-backed behavior over implicit defaults.
- Treat API contracts as product commitments.
- Keep implementation changes and docs changes in the same PR when behavior changes.
- Use idempotency, deterministic state transitions, and auditable logs for critical paths.
- Optimize for MVP shipping readiness, not local "it works on my machine" confidence.

## 16) Long-term platform evolution

Future direction is tracked in `docs/context/platform-evolution.md`.

This section remains intentionally short so MVP product-context truth stays focused on current delivery scope.

## 17) Non-negotiable business invariants

- No cross-company data leakage: tenant boundaries are strict.
- Role and billing authority boundaries are strict (admin-only billing authority).
- Invite ownership and acceptance must enforce issuer scope, recipient identity, and lifecycle validity.
- Subscription and credit behavior must be reconciled to authoritative billing events and audit trail.
- Contract and route integrity must remain consistent across post/bid/contract/application workflows.

## 18) Known incomplete areas (MVP)

- Final UAT validation coverage.
- Release evidence completeness.
- Legacy contract lifecycle traceability remains in archive (`docs/archive/2026/contracts/` + archive notes).
- Some edge-case handling in billing/OTP/invites (see implementation-status).

## 19) AI-agent operating instructions for implementation work

Before editing code:

1. Read `docs/README.md` for process rules and source precedence.
2. Read this file (`docs/context/product-context.md`) for product/domain scope.
3. Read `docs/context/implementation-status.md` and `docs/context/architecture.md`.
4. Read relevant API contracts in `docs/contracts/api/*` (canonical source).
5. Read release docs when touching auth, billing, webhooks, invites, sessions, OTP, observability, or UAT-sensitive areas.

Highest-trust sources:

- endpoint behavior: `docs/contracts/api/*`
- release risk and ship/no-ship criteria: release docs and readiness trackers
- product/domain intent: this file
- process and conflict rules: `docs/README.md`

Required doc updates in same change:

- If API behavior changes: update matching contract doc.
- If implementation scope/capability changes materially: update implementation status context.
- If release risk/gate state changes: update release readiness, go/no-go, and evidence/UAT docs.

Anti-drift rules:

- Do not invent new domain behavior that is outside MVP flow definitions without explicit decision capture.
- Do not treat archive docs as active truth unless referenced by active docs.
- If documents conflict, apply source precedence and record resolution note in the same PR.
- If the task introduces new domain behavior, changes to billing/auth logic, or breaking contract changes, STOP and surface the decision before implementing.

## 20) Related docs

Process and precedence:

- `docs/README.md`

Context:

- `docs/context/architecture.md`
- `docs/context/implementation-status.md`

API contracts:

- canonical source: `docs/contracts/api/`

Delivery and release:

- `docs/delivery/roadmap.md`
- `docs/delivery/sprints/sprint-003.md` (active sprint mapping may change via roadmap)
- `docs/delivery/task-log.md`
- `docs/release/runbook.md`
- `docs/release/evidence-map.md`
- `docs/release/uat-smoke-checklist.md`
- `docs/release/mvp-readiness.md`
- `docs/release/go-no-go.md`
