# Next Implementation Plan (3 Sprints)

This plan focuses on closing MVP production risks first (money-path correctness, auth hardening, and release reliability), then enabling smooth frontend integration.

## Sprint 1 - Billing Authz + Real Entitlements

### 1) Enforce billing authorization
- Scope:
  - `src/modules/subscriptions/subscriptions.routes.ts`
  - `src/modules/billing/billing.routes.ts`
  - related service-level guards
- Goal:
  - Only `COMPANY_ADMIN` can perform billing/subscription mutations.
- Acceptance:
  - Non-admin company users get `403` on protected billing actions.
  - Coverage added/updated in `tests/integration/billingPlans.spec.ts`.

### 2) Replace permissive entitlements checks
- Scope:
  - `src/shared/middleware/requirePlanFeature.middleware.ts`
  - `src/shared/middleware/enforceUsageLimit.middleware.ts`
  - `src/shared/billing/usage.service.ts`
- Goal:
  - Resolve plan/features from DB (`company.currentPlanId` and/or current subscription), not request headers.
- Acceptance:
  - Spoofed `x-company-plan` (or equivalent) has no effect.
  - Protected endpoints enforce real plan limits.

### 3) Stabilize subscription usage counters
- Scope:
  - usage increment/reset paths tied to posts/bids limits.
- Goal:
  - Deterministic counters with explicit monthly reset semantics.
- Acceptance:
  - Integration tests prove counter correctness at boundaries.

## Sprint 2 - Webhooks + OTP/Invite Hardening

### 1) Expand webhook idempotency coverage
- Scope:
  - `src/modules/webhooks/webhooks.service.ts`
  - `src/modules/webhooks/webhooks.repository.ts`
  - `tests/integration/billingWebhookLifecycle.spec.ts`
  - `tests/integration/releaseSmokeChain.spec.ts`
- Goal:
  - Replay/duplicate Stripe events cause exactly-once mutation.
- Acceptance:
  - Duplicate event replays return success but create no duplicate wallet/subscription effects.

### 2) Harden OTP challenge lifecycle
- Scope:
  - `src/modules/auth/auth.service.ts`
  - `src/modules/auth/auth.otpDelivery.ts`
  - `tests/integration/authOtpFlows.spec.ts`
- Goal:
  - Enforce expiration, max attempts, lockout, resend cooldown, and single-use semantics.
- Acceptance:
  - Abuse/edge-case tests pass (expired, reused, over-attempted, over-resend).

### 3) Harden company invite acceptance flow
- Scope:
  - `src/modules/companyInvites/companyInvites.service.ts`
  - invite acceptance test suite (add/extend if missing)
- Goal:
  - Only intended user can accept valid invite; expired/revoked/used invites are blocked.
- Acceptance:
  - Integration cases cover wrong-user acceptance and lifecycle transitions.
- Status: DONE (2026-04-02)
- Coverage now includes: mismatched email rejection, expired+auto-expire marking, revoked rejection, accepted-token reuse rejection, verified OTP requirement, and consumed-OTP reuse rejection.

## Sprint 3 - CI/CD + Observability + Frontend Integration Readiness

### 1) CI baseline and release gates
- Scope:
  - `package.json` scripts
  - `.github/workflows/ci.yml` (new)
- Goal:
  - Every PR must pass `build`, `test`, and release smoke suite.
- Acceptance:
  - Required checks block merge on failure.
- Status: PARTIAL DONE (2026-04-17)
- Notes:
  - `.github/workflows/ci.yml` added and runs prisma validate/generate, migrate deploy, build, full tests, and release smoke tests.
  - GitHub required-check enforcement remains a repo settings step.

### 2) Operational observability baseline
- Scope:
  - `src/config/logger.ts`
  - `src/shared/middleware/requestContext.middleware.ts`
  - `src/workers/billingWebhook.worker.ts`
- Goal:
  - Traceable request/job/event logs with IDs for debugging incidents.
- Acceptance:
  - Failures can be correlated by `requestId` / event / job IDs.
- Status: DONE (2026-04-17)
- Notes:
  - Request logging now uses deterministic request IDs and includes user/company/session correlation fields.
  - Worker logs include queue/job/event IDs plus attempts for failure tracing.
  - Logger baseline includes service/env metadata and sensitive field redaction.

### 3) Frontend contract freeze (MVP APIs)
- Scope:
  - docs for auth, billing, invite, job-seeker credits workflows
  - update existing contracts (`docs/api-contracts-job-seeker-billing.md` and related)
- Goal:
  - Stable response/error shapes for frontend implementation.
- Acceptance:
  - FE can integrate without backend guesswork; UAT smoke scripts documented.
- Status: PARTIAL DONE (2026-04-17)
- Notes:
  - Added contract docs for auth, company invites, and company billing/subscriptions.
  - Existing job seeker billing contract retained.
  - UAT smoke scripts still need explicit documentation pass.

---

## Priority Order (Strict)
1. Billing authz and entitlements
2. Webhook idempotency and money-path tests
3. OTP/invite hardening
4. CI/CD enforcement
5. Observability and contract freeze

## Suggested Timebox
- Aggressive: 7-10 business days
- Realistic: 2-4 weeks

## Definition of Done for this plan
- All sprint acceptance criteria pass
- Release smoke chain passes consistently
- Production closeout checklist is fully green

