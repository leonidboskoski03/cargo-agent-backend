---
title: Reviews API Contract
doc_type: api-contract
status: active
owner: backend-platform
version: 1.0.0
review_status: code-derived
reviewed_at: 2026-06-05
source_legacy: none
summary: Canonical API contract for contract-linked company reviews.
---

# Reviews API Contract

## Scope

Defines implemented review endpoints under `/api/v1/reviews`.

## Global conventions

- Auth required: yes.
- Success envelope: `{ "success": true, "data": ... }`.
- Error envelope includes `error.code`, `error.message`, optional `error.details`, and `meta.traceId`.
- Company admins and drivers can list/read reviews in their company context.
- Company admins can create, update, publish/withdraw, delete, and restore reviews created by their company.

## Endpoints

- `GET /api/v1/reviews?status=DRAFT&contractId=...`
- `GET /api/v1/reviews/:reviewId`
- `POST /api/v1/reviews`
- `PATCH /api/v1/reviews/:reviewId`
- `PATCH /api/v1/reviews/:reviewId/status`
- `DELETE /api/v1/reviews/:reviewId`
- `POST /api/v1/reviews/:reviewId/restore`

## Request and response notes

- Reviews are always linked to contracts.
- Reviews can only be created for `COMPLETED` contracts where the caller company is shipper or carrier.
- Default create status is `DRAFT` when omitted by frontend/backend request.
- Draft reviews are visible only to the reviewer company; published/withdrawn reviews are visible to involved companies.
- Only draft reviews can be edited.
- Allowed status transitions:
  - `DRAFT -> PUBLISHED`
  - `DRAFT -> WITHDRAWN`
  - `PUBLISHED -> WITHDRAWN`
- Publishing enqueues a `REVIEW_PUBLISHED` notification event.
- List endpoints return arrays only, without pagination metadata.

## Error cases

- `401 UNAUTHENTICATED`: missing auth.
- `403 FORBIDDEN`: non-company user, non-admin mutation, or tenant scope violation.
- `403 COMPANY_REQUIRED`: company user missing company context.
- `404 CONTRACT_NOT_FOUND` / `REVIEW_NOT_FOUND`: target missing, deleted, or inaccessible.
- `409 CONTRACT_NOT_COMPLETED`: contract is not complete.
- `409 REVIEW_ALREADY_EXISTS`: one review already exists for caller company and contract.
- `409 REVIEW_NOT_EDITABLE`: attempted edit outside draft state.
- `409 INVALID_REVIEW_STATUS_TRANSITION`: unsupported status transition.
- `400 REVIEW_NOT_DELETED`: restore requested for an active review.
- `400 VALIDATION_ERROR`: request schema failure.

## Test evidence

- `tests/integration/supportCloseout.spec.ts`
- `tests/integration/marketplaceScenario.spec.ts`
- `tests/unit/modules/reviews/reviews.service.spec.ts`
- `tests/unit/workflows/marketplaceLifecycle.spec.ts`

## Changelog

- 2026-06-05: Created canonical reviews API contract from current routes, validators, service behavior, and integration evidence.
