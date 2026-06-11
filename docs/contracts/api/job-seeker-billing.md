---
title: Job Seeker Billing API Contract
doc_type: api-contract
status: active
owner: backend-platform
version: 1.0.0
review_status: code-derived
reviewed_at: 2026-04-20
source_legacy: docs/archive/2026/contracts/api-contracts-job-seeker-billing.md
summary: Canonical API contract for job seeker wallet, usage, credit packs, checkout, transactions, and apply billing metadata.
---

# Job Seeker Billing API Contract

Monetization note: the job-seeker wallet covers apply spend, independent looking-listing publish spend, vehicle-listing publish spend, and promotion spend. Included quota is consumed before credits.

## 1. Scope

This contract defines implemented endpoints for `JOB_SEEKER` monetization and apply-flow billing metadata.

Includes:

- Wallet and usage reads.
- Credit pack discovery.
- Transaction history.
- Checkout session create/read.
- Admin adjustments (feature-gated).
- Billing metadata returned by job-application apply endpoint.

## 2. Global conventions

- Base prefix: `/api/v1/job-seeker-billing`
- Auth: required for all endpoints in this contract.
- Success envelope:

```json
{ "success": true, "data": {} }
```

- Error envelope:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  },
  "meta": {
    "traceId": "request-trace-id"
  }
}
```

## 3. Endpoint list

- `GET /wallet`
- `GET /usage`
- `GET /packs`
- `GET /transactions`
- `POST /checkout-sessions`
- `GET /checkout-sessions/:sessionId`
- `POST /admin/adjustments`
- Related billing metadata endpoint: `POST /api/v1/job-applications/:jobApplicationId/apply`

## 4. Per-endpoint purpose

- `GET /wallet`: return current wallet balance for authenticated job seeker.
- `GET /usage`: return quota usage, limits, and current wallet snapshot.
- `GET /packs`: list available credit packs.
- `GET /transactions`: paginated credit ledger history.
- `POST /checkout-sessions`: create Stripe checkout session for credit pack purchase.
- `GET /checkout-sessions/:sessionId`: return checkout session status/details for own session.
  - Frontend return/status route: `/job-wallet/checkout/:sessionId`.
- `POST /admin/adjustments`: apply support/admin credit adjustment to target job seeker.
- `POST /api/v1/job-applications/:jobApplicationId/apply`: return submission + billing metadata for apply action.

## 5. Roles allowed

- `GET /wallet`: `JOB_SEEKER` only.
- `GET /usage`: `JOB_SEEKER` only.
- `GET /packs`: any authenticated user.
- `GET /transactions`: `JOB_SEEKER` only.
- `POST /checkout-sessions`: `JOB_SEEKER` only.
- `GET /checkout-sessions/:sessionId`: `JOB_SEEKER`, own session only.
- `POST /admin/adjustments`: `COMPANY_ADMIN` with `companyId`; endpoint also requires feature flag.
- `POST /api/v1/job-applications/:jobApplicationId/apply`: available to job seekers and company users; billing block is returned for `JOB_SEEKER` path.

## 6. Request shape

### `GET /packs`

Query:

- `activeOnly` (boolean, default `true`)

### `GET /transactions`

Query:

- `page` (int, default `1`)
- `pageSize` (int, default `20`, max `100`)

### `POST /checkout-sessions`

Body:

```json
{
  "creditPackCode": "JS_CREDITS_30",
  "idempotencyKey": "optional-key-123"
}
```

### `GET /checkout-sessions/:sessionId`

Path params:

- `sessionId`

Validation details:

- `sessionId` must be `cuid`.

### `POST /admin/adjustments`

Body:

```json
{
  "targetUserId": "ck_target_user",
  "amountCredits": 7,
  "reasonCode": "MANUAL_SUPPORT_TOPUP"
}
```

Validation details:

- `amountCredits` must be non-zero integer.
- `reasonCode` length `3..120`.

## 7. Success response

### `GET /wallet` (`200`)

```json
{
  "success": true,
  "data": {
    "userId": "ck...",
    "balanceCredits": 42,
    "updatedAt": "2026-03-20T10:00:00.000Z"
  }
}
```

### `GET /usage` (`200`)

```json
{
  "success": true,
  "data": {
    "userId": "ck_user",
    "periodStart": "2026-03-01T00:00:00.000Z",
    "wallet": { "balanceCredits": 12 },
    "quotas": {
      "applications": {
        "used": 3,
        "limit": 10,
        "remaining": 7,
        "creditCostPerAction": 1
      },
      "activeListings": {
        "used": 0,
        "limit": 1,
        "remaining": 1
      }
    }
  }
}
```

### `GET /packs` (`200`)

Returns list of credit-pack rows from repository, ordered by `priceAmount ASC`, then `createdAt ASC`.

### `GET /transactions` (`200`)

Returns list of transaction rows from repository, ordered by `createdAt DESC`, paged by `page/pageSize`.

### `POST /checkout-sessions` (`201`)

```json
{
  "success": true,
  "data": {
    "checkoutSessionId": "ck_local_session",
    "stripeCheckoutSessionId": "cs_test_...",
    "checkoutUrl": "https://checkout.stripe.com/...",
    "status": "CREATED",
    "amountCredits": 30,
    "currency": "EUR",
    "reused": false
  }
}
```

When idempotency key matches an existing checkout, response remains `201` and returns existing session with `reused: true`.

### `GET /checkout-sessions/:sessionId` (`200`)

Returns checkout session row and nested `creditPack` object.

### `POST /admin/adjustments` (`200`)

```json
{
  "success": true,
  "data": {
    "targetUserId": "ck_target_user",
    "amountCredits": 7,
    "reasonCode": "MANUAL_SUPPORT_TOPUP",
    "balanceAfter": 12,
    "transactionId": "ck_tx"
  }
}
```

### `POST /api/v1/job-applications/:jobApplicationId/apply` (`201`)

For `JOB_SEEKER`, success includes billing block:

```json
{
  "success": true,
  "data": {
    "id": "submission_id",
    "jobApplicationId": "ck_job",
    "submittedByUserId": "ck_user",
    "billing": {
      "mode": "FREE_QUOTA",
      "freeMonthlyLimit": 10,
      "usedThisMonth": 1,
      "remainingFreeApplications": 9,
      "creditCost": 1,
      "walletBalanceCredits": 0
    }
  }
}
```

## 8. Error cases

- `GET /wallet`: `403 FORBIDDEN` for non-`JOB_SEEKER`.
- `GET /usage`: `403 FORBIDDEN` for non-`JOB_SEEKER`.
- `GET /transactions`: `403 FORBIDDEN` for non-`JOB_SEEKER`.
- `POST /checkout-sessions`:
  - `403 FORBIDDEN` for non-`JOB_SEEKER`
  - `404 CREDIT_PACK_NOT_FOUND`
  - `500 CREDIT_PACK_PRICE_NOT_CONFIGURED`
  - `500 BILLING_PROVIDER_NOT_CONFIGURED`
- `GET /checkout-sessions/:sessionId`:
  - `404 CHECKOUT_SESSION_NOT_FOUND`
  - `403 FORBIDDEN` for cross-user access
- `POST /admin/adjustments`:
  - `403 FORBIDDEN` for non-company-admin callers
  - `403 FEATURE_DISABLED`
  - `404 USER_NOT_FOUND`
  - `400 INVALID_TARGET_ROLE`
  - `409 INSUFFICIENT_BALANCE`
- `POST /api/v1/job-applications/:jobApplicationId/apply` insufficient credits:
  - HTTP `402`
  - `error.code = INSUFFICIENT_CREDITS`
  - `error.details` includes `creditCost`, `walletBalanceCredits`, `freeMonthlyLimit`, `remainingFreeApplications`

- `400 VALIDATION_ERROR`: invalid query/body/params.

## 9. Invariants / business rules

- Wallet and usage endpoints are job-seeker lane controls.
- Checkout session read is owner-scoped (`own session only`).
- Admin adjustments are feature-gated by `INTERNAL_ADMIN_ADJUSTMENTS_ENABLED=true`.
- Apply-flow billing must report free-quota usage and credit-cost context.
- Credit purchase/spend semantics rely on idempotent billing processing.
- Checkout creation supports idempotency-key reuse path for same user.

Relevant environment flags/values:

- `JOB_SEEKER_FREE_APPLICATIONS_PER_MONTH`
- `JOB_SEEKER_FREE_ACTIVE_LISTINGS`
- `JOB_SEEKER_APPLICATION_CREDIT_COST`
- `INTERNAL_ADMIN_ADJUSTMENTS_ENABLED`

## 10. Breaking changes

- None from legacy contract source.
- Contract/code mismatch triage:
  - `FIXED 2026-06-06`: `GET /packs` now uses validated query parsing for `activeOnly`; supported boolean encodings are `true/false/1/0/yes/no`.

## 11. Test and UAT notes

- Integration evidence:
  - `tests/integration/jobSeekerBilling.spec.ts`
  - `tests/integration/jobSeekerWebhookIdempotency.spec.ts`
  - `tests/integration/marketplaceEndToEnd.spec.ts`
  - `tests/integration/releaseSmokeChain.spec.ts`
- Verified behaviors include:
  - wallet/usage/packs/transactions endpoint shape and role guards
  - admin adjustment feature-gate and enabled path with audit log write
  - webhook idempotency for checkout top-up crediting
  - apply endpoint billing metadata (`FREE_QUOTA` and `CREDITS` modes)

## 12. Changelog

- 2026-04-19: Normalized from `docs/archive/2026/contracts/api-contracts-job-seeker-billing.md` into canonical contract structure.
- 2026-04-20: Reworked from migration-grade to implementation-grade using validators/controllers/services/repository and integration tests.
- 2026-06-06: Marked `activeOnly` query parsing mismatch fixed and covered by integration regression.
