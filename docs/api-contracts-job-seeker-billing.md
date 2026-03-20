# API Contracts: Job Seeker Billing

Last updated: 2026-03-20

This document defines stable request/response contracts for JOB_SEEKER monetization and related apply-flow billing metadata.

## Base

- Prefix: `/api/v1/job-seeker-billing`
- Auth: required for all endpoints

## Common Error Envelope

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

## `GET /wallet`

Role:

- `JOB_SEEKER` only

Success `200`:

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

Errors:

- `403 FORBIDDEN` when role is not `JOB_SEEKER`

## `GET /usage`

Role:

- `JOB_SEEKER` only

Success `200`:

```json
{
  "success": true,
  "data": {
    "userId": "ck_user",
    "periodStart": "2026-03-01T00:00:00.000Z",
    "wallet": {
      "balanceCredits": 12
    },
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

## `GET /packs`

Query:

- `activeOnly` (boolean, default `true`)

Success `200`:

```json
{
  "success": true,
  "data": [
    {
      "id": "ck...",
      "code": "JS_CREDITS_10",
      "name": "Starter 10",
      "credits": 10,
      "priceAmount": "4.99",
      "currency": "EUR",
      "isActive": true,
      "stripePriceId": null,
      "createdAt": "2026-03-20T10:00:00.000Z",
      "updatedAt": "2026-03-20T10:00:00.000Z"
    }
  ]
}
```

## `GET /transactions`

Role:

- `JOB_SEEKER` only

Query:

- `page` (int, default `1`)
- `pageSize` (int, default `20`, max `100`)

Success `200`:

```json
{
  "success": true,
  "data": [
    {
      "id": "ck...",
      "walletId": "ck...",
      "userId": "ck...",
      "type": "PURCHASE",
      "amountCredits": 30,
      "reasonCode": "CHECKOUT_TOPUP",
      "referenceType": "JOB_SEEKER_CHECKOUT",
      "referenceId": "ck...",
      "stripePaymentRef": "cs_test_...",
      "balanceAfter": 45,
      "createdAt": "2026-03-20T10:00:00.000Z"
    }
  ]
}
```

## `POST /checkout-sessions`

Role:

- `JOB_SEEKER` only

Request body:

```json
{
  "creditPackCode": "JS_CREDITS_30"
}
```

Success `201`:

```json
{
  "success": true,
  "data": {
    "checkoutSessionId": "ck_local_session",
    "stripeCheckoutSessionId": "cs_test_...",
    "checkoutUrl": "https://checkout.stripe.com/...",
    "status": "CREATED",
    "amountCredits": 30,
    "currency": "EUR"
  }
}
```

Errors:

- `404 CREDIT_PACK_NOT_FOUND`
- `500 CREDIT_PACK_PRICE_NOT_CONFIGURED`
- `500 BILLING_PROVIDER_NOT_CONFIGURED`

## `GET /checkout-sessions/:sessionId`

Role:

- `JOB_SEEKER` only
- own session only

Success `200`:

```json
{
  "success": true,
  "data": {
    "id": "ck...",
    "userId": "ck...",
    "creditPackId": "ck...",
    "status": "COMPLETED",
    "stripeCheckoutSessionId": "cs_test_...",
    "amountCredits": 30,
    "amountPaid": "12.99",
    "currency": "EUR",
    "completedAt": "2026-03-20T10:10:00.000Z",
    "expiresAt": null,
    "createdAt": "2026-03-20T10:00:00.000Z",
    "updatedAt": "2026-03-20T10:10:00.000Z",
    "creditPack": {
      "id": "ck...",
      "code": "JS_CREDITS_30",
      "name": "Growth 30",
      "credits": 30,
      "priceAmount": "12.99",
      "currency": "EUR",
      "stripePriceId": null,
      "isActive": true,
      "createdAt": "2026-03-20T10:00:00.000Z",
      "updatedAt": "2026-03-20T10:00:00.000Z"
    }
  }
}
```

Errors:

- `404 CHECKOUT_SESSION_NOT_FOUND`
- `403 FORBIDDEN` for cross-user access

## `POST /admin/adjustments`

Role:

- `COMPANY_ADMIN` only

Feature gate:

- requires `INTERNAL_ADMIN_ADJUSTMENTS_ENABLED=true`

Request body:

```json
{
  "targetUserId": "ck_target_user",
  "amountCredits": 7,
  "reasonCode": "MANUAL_SUPPORT_TOPUP"
}
```

Success `200`:

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

Errors:

- `403 FEATURE_DISABLED` when internal flag is off
- `404 USER_NOT_FOUND`
- `400 INVALID_TARGET_ROLE` when target is not `JOB_SEEKER`
- `409 INSUFFICIENT_BALANCE` for invalid negative adjustment

## Job Applications Apply Billing Metadata

Endpoint:

- `POST /api/v1/job-applications/:jobApplicationId/apply`

For `JOB_SEEKER`, success includes billing payload:

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

Insufficient credits:

- HTTP `402`
- `error.code = INSUFFICIENT_CREDITS`
- `error.details` includes:
  - `creditCost`
  - `walletBalanceCredits`
  - `freeMonthlyLimit`
  - `remainingFreeApplications`

## Relevant ENV

- `JOB_SEEKER_FREE_APPLICATIONS_PER_MONTH`
- `JOB_SEEKER_FREE_ACTIVE_LISTINGS`
- `JOB_SEEKER_APPLICATION_CREDIT_COST`
- `INTERNAL_ADMIN_ADJUSTMENTS_ENABLED`

