---
title: Company Billing and Subscriptions API Contract
doc_type: api-contract
status: active
owner: backend-platform
version: 1.0.0
review_status: code-derived
reviewed_at: 2026-06-08
source_legacy: docs/archive/2026/contracts/api-contracts-company-billing-subscriptions.md
summary: Canonical API contract for company billing events and subscription lifecycle endpoints.
---

# Company Billing and Subscriptions API Contract

## 1. Scope

This contract defines implemented company-lane billing and subscription endpoints.

Covered:

- Billing events listing.
- Billing readiness booleans for staging diagnostics.
- Current subscription read.
- Subscription mutation endpoints (checkout/cancel/revert/portal).

## 2. Global conventions

- Billing prefix: `/api/v1/billing`
- Subscription prefix: `/api/v1/subscriptions`
- Auth required: yes for all endpoints in this contract.
- Mutation authorization: `COMPANY_ADMIN` required for subscription write actions.
- Success envelope:

```json
{ "success": true, "data": {} }
```

- Error envelope follows shared handler (`code`, `message`, optional `details`, `meta.traceId`).

## 3. Endpoint list

- `GET /api/v1/billing/events`
- `GET /api/v1/billing/readiness`
- `GET /api/v1/subscriptions/me`
- `POST /api/v1/subscriptions/checkout-session`
- `POST /api/v1/subscriptions/cancel-at-period-end`
- `POST /api/v1/subscriptions/cancel-revert`
- `POST /api/v1/subscriptions/portal-session`

## 4. Per-endpoint purpose

- `GET /api/v1/billing/events`: list billing events for caller company scope.
- `GET /api/v1/billing/readiness`: return non-secret Stripe/queue/price readiness booleans for authenticated users.
- `GET /api/v1/subscriptions/me`: return current company subscription state.
- `POST /api/v1/subscriptions/checkout-session`: create or reuse Stripe checkout session for plan change.
- `POST /api/v1/subscriptions/cancel-at-period-end`: schedule cancellation for period end.
- `POST /api/v1/subscriptions/cancel-revert`: revert scheduled cancellation.
- `POST /api/v1/subscriptions/portal-session`: create Stripe billing portal session.

## 5. Roles allowed

- `GET /api/v1/billing/events`: authenticated company user in company scope.
- `GET /api/v1/billing/readiness`: authenticated user; returns booleans only and never exposes secret values.
- `GET /api/v1/subscriptions/me`: authenticated company user in company scope.
- Subscription mutations (`POST` endpoints under `/api/v1/subscriptions/*` above): `COMPANY_ADMIN` only.

## 6. Request shape

- `GET /api/v1/billing/events` query:
  - `page` (int, min 1, default 1)
  - `pageSize` (int, min 1, max 100, default 20)
- `GET /api/v1/billing/readiness`: empty body/query/params.
- `GET /api/v1/subscriptions/me`: empty body/query/params.
- `POST /api/v1/subscriptions/checkout-session` body:
  - `planCode` (`FREE` | `PRO`, default `PRO`)
  - `idempotencyKey` (optional string, 8..120)
- `POST /api/v1/subscriptions/cancel-at-period-end` body:
  - `reason` (optional string, max 500)
- `POST /api/v1/subscriptions/cancel-revert`: empty body/query/params.
- `POST /api/v1/subscriptions/portal-session`: empty body/query/params.

## 7. Success response

- `GET /api/v1/billing/events` returns HTTP `200` and an array of billing-event rows for caller company, ordered by `createdAt DESC`, paginated via `skip/take`.
- `GET /api/v1/billing/readiness` returns HTTP `200`:
  - `stripeSecretConfigured`
  - `stripeWebhookSecretConfigured`
  - `proPriceConfigured`
  - `companyCreditPricesConfigured`
  - `jobSeekerCreditPricesConfigured`
  - `bullmqEnabled`
- `GET /api/v1/subscriptions/me` returns HTTP `200` with either:
  - `null` when no current subscription exists
  - object:
    - `companyId`, `planCode`, `status`, `startsAt`, `endsAt`, `cancelAtPeriodEnd`, `currentPeriodStart`, `currentPeriodEnd`
- `POST /api/v1/subscriptions/checkout-session` returns HTTP `200`:
  - fresh session:
    - `provider`, `planCode`, `checkoutSessionId`, `checkoutUrl`, `status: "READY"`
  - reused idempotent session:
    - `provider`, `planCode`, `checkoutSessionId`, `checkoutUrl`, `status: "REUSED"`
- `POST /api/v1/subscriptions/cancel-at-period-end` returns HTTP `200`:
  - `companyId`, `cancelAtPeriodEnd`, `status`
- `POST /api/v1/subscriptions/cancel-revert` returns HTTP `200`:
  - `companyId`, `cancelAtPeriodEnd`, `status`
- `POST /api/v1/subscriptions/portal-session` returns HTTP `200`:
  - `provider`, `url`

## 8. Error cases

- `401 UNAUTHENTICATED`: missing auth or missing `companyId` context.
- `403 FORBIDDEN`: non-admin access to subscription mutation endpoints.
- `400 INVALID_PLAN_FOR_CHECKOUT`: `planCode=FREE` for checkout endpoint.
- `404 COMPANY_NOT_FOUND`: company not found.
- `404 PLAN_NOT_FOUND`: requested plan inactive/missing.
- `404 SUBSCRIPTION_NOT_FOUND`: cancel/revert with no current subscription.
- `409 STRIPE_CUSTOMER_NOT_FOUND`: portal requested before Stripe customer exists.
- `500 BILLING_PROVIDER_NOT_CONFIGURED`: Stripe client/keys not configured.
- `500 PLAN_PRICE_NOT_CONFIGURED`: selected plan missing Stripe price id.
- `400 VALIDATION_ERROR`: request schema failure.

## 9. Invariants / business rules

- Company drivers/non-admin users cannot perform subscription mutations.
- Webhook reconciliation is source of truth for eventual subscription state transitions.
- Billing history is company-scoped and paginated.
- Billing readiness returns configuration booleans only; raw `sk_`, `whsec_`, and `price_` values are never returned.
- No cross-tenant billing data exposure.
- Subscription lookup uses current subscription (`isCurrent=true`) with most recently updated row precedence.
- Idempotency key reuse returns existing checkout session instead of creating a new one.

## 10. Breaking changes

- No intentional breaking changes introduced in this pass.
- Contract/code mismatches surfaced:
  - `POST /api/v1/subscriptions/cancel-at-period-end` validator accepts `reason`, but controller/service currently ignore it.
  - `GET /api/v1/billing/events` returns a raw array only; no pagination metadata envelope fields are returned.

## 11. Test and UAT notes

- Integration evidence:
  - `tests/integration/billingPlans.spec.ts`
  - `tests/integration/releaseSmokeChain.spec.ts` (webhook chain)
- Verified behaviors include:
  - `/billing/events` company-scoped listing
  - non-admin `403` on all subscription mutation endpoints
  - cancel and cancel-revert success for non-Stripe current subscriptions
  - provider-not-configured failure for portal session when Stripe keys missing
  - `/billing/readiness` returns booleans without leaking provider secrets

## 12. Changelog

- 2026-04-19: Normalized from `docs/archive/2026/contracts/api-contracts-company-billing-subscriptions.md` into canonical contract structure.
- 2026-04-20: Reworked from migration-grade to implementation-grade using billing/subscriptions validators, controllers, services, repositories, and integration tests.
- 2026-06-08: Added `/billing/readiness` staging diagnostics contract for non-secret Stripe/queue/price readiness.
