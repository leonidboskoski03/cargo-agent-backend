---
title: Plans API Contract
doc_type: api-contract
status: active
owner: backend-platform
version: 1.0.0
review_status: code-derived
reviewed_at: 2026-04-20
source_legacy: none
summary: Canonical API contract for public plans listing.
---

# Plans API Contract

## 1. Scope

This contract defines the plan-listing API surface under `/api/v1/plans`.

Covered:

- Public listing of plans.
- Active-only filtering behavior.

## 2. Global conventions

- Base prefix: `/api/v1/plans`
- Auth required: no.
- Success envelope:

```json
{ "success": true, "data": [] }
```

- Error envelope follows shared API error handler with `error.code`, `error.message`, optional `error.details`, and `meta.traceId`.

## 3. Endpoint list

- `GET /api/v1/plans`

## 4. Per-endpoint purpose

- `GET /api/v1/plans`: return plans ordered for catalog display, with optional inclusion of inactive plans.

## 5. Roles allowed

- Public endpoint: no role required.

## 6. Request shape

- Query:
  - `activeOnly` (optional boolean, default intended `true`)
- No request body.
- No path params.

Examples:

- `GET /api/v1/plans`
- `GET /api/v1/plans?activeOnly=false`

TODO/Needs verification:

- Controller currently checks `req.query.activeOnly === "true"`; behavior for non-`"true"` truthy values should be confirmed and harmonized with validator coercion.

## 7. Success response

- HTTP `200` with array of `Plan` rows from Prisma `plan.findMany`.
- Current ordering:
  1. `priceAmount ASC`
  2. `createdAt ASC`

Observed fields are model-driven (full `Plan` row, no `select` in repository).

## 8. Error cases

- `400 VALIDATION_ERROR`: invalid query shape.
- `500 INTERNAL_SERVER_ERROR`: unexpected runtime/database failure.

## 9. Invariants / business rules

- Endpoint is public and must not require authentication.
- Default behavior excludes inactive plans.
- `activeOnly=false` includes both active and inactive plans.
- Ordering is stable by `priceAmount` then `createdAt`.

## 10. Breaking changes

- None from current implementation baseline.
- Any future plan DTO remapping (instead of raw model rows) is FE-impacting and requires contract version update.

## 11. Test and UAT notes

- Integration evidence:
  - `tests/integration/billingPlans.spec.ts`
    - verifies default active-only behavior.
    - verifies `activeOnly=false` includes inactive plans.
- Smoke evidence:
  - `tests/integration/apiSmoke.spec.ts`

## 12. Changelog

- 2026-04-20: Created canonical plans contract from routes/validator/controller/service/repository and integration tests.

