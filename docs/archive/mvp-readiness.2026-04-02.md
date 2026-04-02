# MVP Readiness Matrix

Last updated: 2026-03-20

## Executive Verdict

Backend is **very close to MVP release**, but **not production-ready yet**.

Main reason: there are still release-critical consistency/authorization gaps to close before frontend handoff is considered safe.

## Status Legend

- DONE: Implemented with service logic + authz + routes + persistence + tests.
- PARTIAL: Core flow exists, but has exposure/guarding/test gaps.
- TODO: Not implemented for MVP-level use.

## Module Status

| Module | Status | Notes |
|---|---|---|
| auth | DONE | Login/logout/register + OTP challenges + password flows + session management (`/sessions`, per-session revoke, logout-all) + MFA login completion are implemented. |
| users | DONE | Profile/membership/soft-delete/restore flows with role/company guardrails implemented. |
| companies | PARTIAL | Company-scoped read/update/delete/restore is implemented; company creation onboarding endpoint is still not part of the finalized MVP flow. |
| licenses | DONE | Ownership rules + role scope + soft-delete/restore implemented. |
| vehicles | DONE | Company vs job-seeker ownership and role restrictions implemented. |
| vehicleAssignments | DONE | Assignment overlap checks + ownership rules + restore implemented. |
| locations | DONE | CRUD + admin mutations + soft-delete/restore implemented. |
| routes | DONE | CRUD + location validation + soft-delete/restore implemented. |
| posts | DONE | Company workflow + status transitions + soft-delete/restore implemented. |
| bids | DONE | Company bidding flow + accept/reject/withdraw transitions + event emission implemented. |
| contracts | DONE | Accepted-bid linkage + lifecycle transitions + soft-delete/restore implemented. |
| reviews | DONE | Contract-scoped publish/withdraw lifecycle + guardrails implemented. |
| jobApplications | DONE | Job-seeker/company cross-application rules + monetization hook integration implemented. |
| documents | DONE | Metadata CRUD + owner scope + soft-delete/restore implemented. |
| notifications | DONE | DB-backed list/mark-read/mark-all-read + scope enforcement implemented. |
| auditLogs | DONE | Persistent audit logs + scoped listing + key write integrations implemented. |
| plans | DONE | Prisma-backed active/inactive filtering implemented. |
| subscriptions | PARTIAL | Checkout + cancel-at-period-end + webhook lifecycle implemented; route-level admin restriction should be tightened before production. |
| billing | PARTIAL | Real paginated events endpoint implemented; route-level admin restriction should be tightened before production. |
| webhooks | DONE | Lifecycle handling + replay/idempotency protections + tests implemented. |
| companyInvites | PARTIAL | Invite module implementation is strong, but `/api/v1/company-invites` is currently not mounted in `src/routes/v1.ts` (endpoint probe returns 404). |
| jobSeekerBilling | DONE | Wallets/packs/transactions/checkout + webhook top-up + usage/adjustment APIs implemented. |

## Test Coverage Snapshot

### Latest run (verified now)

- Command: `npx vitest run --reporter=verbose`
- Result: **24 test files passed, 66 tests passed, 0 failed**
- Duration: ~9.66s

### Coverage areas present

- Integration smoke across `/api/v1/*` module roots.
- Auth guard checks for protected modules.
- Scenario integration tests:
  - Marketplace lifecycle (`post -> bid -> contract -> review`)
  - Job applications lifecycle
  - Notifications read state
  - Company invites flow
  - Subscription webhook lifecycle + replay
  - Job seeker webhook credit idempotency
- Unit tests for key edge logic in posts, bids, contracts, reviews, job applications, notifications, documents, queue, and webhooks.

### Important caveat

Many integration specs use a DB-availability early return guard. Keep this guard, but for release gating ensure CI uses a guaranteed live test DB so integration tests cannot silently no-op.

## MVP Blockers (High Priority)

1. **Mount company invites routes**
   - Add `companyInvitesRouter` to `src/routes/v1.ts` under `/company-invites`.
2. **Tighten billing/subscription authorization**
   - Restrict subscription and billing actions to `COMPANY_ADMIN` at route/service guard level.
3. **Release-gate integration DB requirement**
   - Ensure CI and release runbook enforce DB availability so integration tests run fully.

## Suggested Final MVP Closeout Order

1. Fix blocker #1 and #2 (routing + role guard hardening).
2. Re-run full test suite + targeted endpoint probes for invites/billing authz.
3. Execute `docs/release-runbook.md` in a clean environment (API + worker + webhook smoke).
4. Perform focused Postman/UAT pass for auth/invite/billing flows.
5. Freeze release candidate and tag.

## Release Readiness Criteria

MVP backend is release-ready when all conditions are true:

- `npm run build` passes.
- `npm test` passes in CI with a live test database.
- `POST/GET /api/v1/company-invites*` routes are reachable and scenario-tested.
- Billing/subscription endpoints are admin-only by policy and tests.
- `docs/release-runbook.md` is executed successfully in a clean environment.
- Stripe webhook replay handling is validated in logs.

## Refactor/Hardening Backlog (Post-Blocker)

1. Add centralized policy helpers for role/company checks to reduce duplicated guards.
2. Add stronger integration assertions around session invalidation and MFA-required login UX paths.
3. Add race-condition tests for concurrent bid acceptance / contract creation and free-quota credit spend boundaries.
4. Start outbox/retry planning for async side effects (notifications/audit fanout) beyond best-effort writes.

## Should You Test in Postman or Start Frontend?

Recommended sequence:

1. **Do a short Postman pass first** (after fixing blockers) for critical auth/invite/billing flows.
2. Then start frontend integration immediately after those checks pass.

Why: backend is close, but invite route exposure + billing role hardening should be validated before frontend depends on those contracts.
