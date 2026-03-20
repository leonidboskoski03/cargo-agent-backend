# Backend Coherence and Next Steps Plan

_Last updated: 2026-03-20_

## 1) Current State Snapshot

The backend is in strong MVP shape with meaningful domain separation:

- Logistics marketplace flow is implemented (`Post -> Bid -> Contract -> Review`) with service guards and key DB constraints.
- Driver job marketplace is implemented (`JobApplication` as listing, `JobApplicationSubmission` as application).
- Auth stack now includes sessions, OTP lifecycle, password reset, invite acceptance hardening.
- Company billing and job seeker credit monetization both have baseline implementation and webhook/idempotency logic.

## 2) Critical Findings (Fix First)

### F1. Company invites routes are not mounted in v1 router
- **Impact**: `companyInvites` API may be unreachable despite existing module/tests.
- **Where**: `src/routes/v1.ts`
- **Fix**: mount `companyInvitesRouter` under `/company-invites`.

### F2. Billing/subscription endpoints are not restricted to `COMPANY_ADMIN`
- **Impact**: company drivers may execute billing actions.
- **Where**: `src/modules/subscriptions/subscriptions.routes.ts`, `src/modules/billing/billing.routes.ts`
- **Fix**: add role guard (`COMPANY_ADMIN`) on billing/subscription actions.

### F3. No hard DB invariant for role/company linkage
- **Impact**: data drift possible (`JOB_SEEKER` with company; company role without company).
- **Where**: `prisma/schema.prisma`
- **Fix**: enforce invariant in app policy + optional DB-level guard strategy.

## 3) Coherence and Design Assessment

### Good foundations already in place
- Role model aligned with product direction: `COMPANY_ADMIN`, `COMPANY_DRIVER`, `JOB_SEEKER`.
- Marketplace split is coherent and mostly enforced.
- OTP challenge model includes purpose/channel/status/attempt/resend/expiry, enabling security-sensitive flows.
- Auth sessions include revocation and token version checks.
- Webhook handling includes event idempotency guard (`providerEventId`).

### Clarifications to keep consistent in docs/code
- `JobApplication` = driver job listing/post.
- `JobApplicationSubmission` = candidate application/submission.
- Invite acceptance is a security-sensitive identity mutation and should remain token + OTP protected.

## 4) Invariants to Enforce Explicitly

### Role invariants
- `JOB_SEEKER` should have `companyId = null`.
- `COMPANY_ADMIN` and `COMPANY_DRIVER` should have `companyId != null`.

### Marketplace invariants
- Company-only flows must reject `JOB_SEEKER`.
- One carrier company bid per post (`@@unique([postId, carrierCompanyId])`) remains required.
- One contract per post and per accepted bid remains required.
- Review must be contract-scoped and by involved company only.

### Auth invariants
- OTP challenges are single-purpose and non-reusable.
- Expired/locked/used OTP cannot be consumed.
- Password/security changes invalidate previous sessions.

### Billing/credits invariants
- Exactly one current active subscription semantics per company.
- Webhook replay cannot duplicate state transitions.
- Credit grants/spends must be transactionally safe and append-only in ledger.

## 5) Missing/Weak Transaction Boundaries

Prioritize transactional hardening for:

- Bid acceptance + side effects (notifications/audit) reliability.
- Contract creation + side effects reliability.
- Invite acceptance membership mutation (already transactional in repository; keep that pattern).
- Checkout completion and wallet credit grant (already transactional; keep idempotent reference checks).

## 6) Dangerous Edge Cases to Cover in Tests

- Concurrent accept bid race for same post.
- Concurrent contract creation for same accepted bid.
- Invite replay and OTP replay combinations.
- Refresh/session replay after revocation.
- Job seeker free-quota boundary race (double-submit near limit).
- Unauthorized company driver billing actions.

## 7) Module Boundary Recommendations

- Keep service layer as policy orchestration.
- Keep repository layer for transactions and persistence details.
- Introduce shared policy helpers to reduce duplicated role checks:
  - `CompanyAccessPolicy`
  - `BillingAccessPolicy`
  - `AuthChallengePolicy`

## 8) MVP-First Execution Order

## Phase 0 - Immediate blockers
1. Mount `companyInvites` routes in `src/routes/v1.ts`.
2. Restrict subscription/billing routes to `COMPANY_ADMIN`.

## Phase 1 - Security and role invariants
1. Centralize role/company linkage checks.
2. Harden company-membership mutation paths with consistent validation.
3. Confirm OTP purpose constraints remain strict for invite and MFA flows.

## Phase 2 - Billing and webhook robustness
1. Expand replay/idempotency integration tests for webhooks.
2. Add failure-path tests for partial webhook data.
3. Add reconciliation process plan for missed events.

## Phase 3 - Job seeker monetization hardening
1. Expand concurrent submission tests at free-limit threshold.
2. Verify no double-spend with parallel submissions.
3. Add explicit ledger audit assertions in tests.

## Phase 4 - Operational hardening
1. Introduce outbox/retry strategy for async side effects.
2. Add observability dashboards for auth/billing/invite events.
3. Prepare provider adapters for production OTP/invite delivery.

## 9) Acceptance Criteria per Phase

### Phase 0 complete when
- `/api/v1/company-invites/*` is reachable and covered by integration tests.
- Billing/subscription endpoints reject non-admin company roles with `403`.

### Phase 1 complete when
- Membership invariant checks are consistently enforced in service paths.
- No endpoint can persist invalid role/company combinations.

### Phase 2 complete when
- Stripe replay tests prove no duplicate billing state mutation.
- Billing events and subscription state remain consistent under repeated events.

### Phase 3 complete when
- Credit/usage counters remain correct under concurrency tests.
- No negative wallet balance occurs unless explicit adjustment policy allows it.

### Phase 4 complete when
- Async event failures are recoverable without business-state corruption.
- Operational signals exist for auth/invite/billing anomalies.

## 10) Suggested Work Cadence

- Sprint A: Phase 0 + Phase 1.
- Sprint B: Phase 2 + Phase 3.
- Sprint C: Phase 4 and production readiness polish.

## 11) Notes for Future Extension

- Keep company billing and job seeker monetization separate bounded contexts.
- Avoid coupling invite onboarding to billing flows.
- Preserve strict separation between logistics marketplace and job seeker marketplace permissions.

