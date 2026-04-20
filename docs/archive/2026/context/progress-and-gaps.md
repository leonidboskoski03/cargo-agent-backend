# Progress and Gaps

Last updated: 2026-04-02

## Achieved So Far

| Area | Status | Notes |
|---|---|---|
| Module architecture | DONE | Feature-based modules + shared infra structure is in place. |
| Auth and sessions | DONE | Register/login/refresh/logout + session list/revoke/all implemented. |
| OTP and MFA | DONE | OTP request/verify/resend and login MFA challenge flows implemented. |
| Password security | DONE | Forgot/reset password flow and session invalidation implemented; optional stricter reset binding added. |
| Marketplace workflow | DONE/PARTIAL | Core post/bid/contract/review flow implemented with guardrails. |
| Billing foundation | PARTIAL | Plans/subscriptions + Stripe checkout/webhook flow exists, still needs hardening in enforcement paths. |
| Queue/worker setup | PARTIAL | BullMQ/Redis and workers are wired; replay/ops polish still needed. |
| Tests | PARTIAL | Strong integration coverage exists; release gating must enforce full DB-backed runs consistently. |

## Dev Workflow vs Production Workflow

| Topic | Dev Today | Production Target | Gap |
|---|---|---|---|
| Runtime | API + worker started manually | Managed runtime with restart/health policies | Partial |
| Dependencies | Local Postgres/Redis/Stripe test mode | Managed infra + alerts + backup policy | Missing |
| Validation | Local build/tests | Mandatory CI gates + required checks | Partial |
| Billing safety | Working baseline | Strong authz + reconciliation + replay tooling | Partial |
| Observability | App logs available | Centralized logs + actionable alerts | Missing |
| Release process | Runbook written | Runbook executed with evidence each release | Partial |

## Missing / Next Work

| Priority | Missing Item | Why It Matters |
|---|---|---|
| P0 | Restrict billing/subscription write endpoints to `COMPANY_ADMIN` | Prevent privilege escalation on money path |
| P0 | DB-backed entitlements and usage checks on core endpoints | Enforce FREE/PRO behavior correctly |
| P0 | Billing reconciliation jobs and stale state cleanup | Recover from missed webhooks and drift |
| P1 | Queue replay tooling + job lifecycle observability | Safer incident response |
| P1 | Freeze and document billing API contracts for frontend | Prevent integration churn |
| P1 | CI enforcement for integration DB and release smoke chain | Avoid false green builds |
| P2 | Enable stricter auth toggles in production rollout | Improve account/session security |
| P2 | Strengthen rollback and operational drills | Reduce release risk |

## Recommended Immediate Next Step

1. Implement and test `COMPANY_ADMIN` authorization on billing/subscription write actions.
2. Immediately after that, wire DB-backed entitlement checks into posts/bids/users limits.

