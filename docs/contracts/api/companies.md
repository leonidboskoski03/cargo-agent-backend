---
title: Companies API Contract
doc_type: api-contract
status: active
owner: backend-platform
version: 1.0.0
review_status: code-derived
reviewed_at: 2026-04-20
source_legacy: none
summary: Canonical API contract for authenticated company profile read/update/delete/restore flows.
---

# Companies API Contract

## 1. Scope

This contract defines company profile endpoints under `/api/v1/companies`.

Covered:

- Authenticated company-scoped reads.
- Company-admin update/delete/restore operations.

## 2. Global conventions

- Base prefix: `/api/v1/companies`
- Auth required: yes for all endpoints.
- Success envelope:

```json
{ "success": true, "data": {} }
```

- Error envelope follows shared handler (`code`, `message`, optional `details`, `meta.traceId`).

## 3. Endpoint list

- `GET /api/v1/companies`
- `GET /api/v1/companies/me`
- `GET /api/v1/companies/:companyId`
- `PATCH /api/v1/companies/me`
- `DELETE /api/v1/companies/me`
- `POST /api/v1/companies/:companyId/restore`

## 4. Per-endpoint purpose

- `GET /`: return caller company as single-item array.
- `GET /me`: return caller company profile object.
- `GET /:companyId`: return company profile only when `companyId` equals caller company.
- `PATCH /me`: update caller company profile (admin only).
- `DELETE /me`: soft-delete caller company (admin only).
- `POST /:companyId/restore`: restore soft-deleted caller company (admin only).

## 5. Roles allowed

- `GET /`, `GET /me`, `GET /:companyId`: `COMPANY_ADMIN`, `COMPANY_DRIVER`.
- `PATCH /me`, `DELETE /me`, `POST /:companyId/restore`: `COMPANY_ADMIN` only.
- `JOB_SEEKER` is forbidden for all company endpoints.

## 6. Request shape

- `GET /` and `GET /me`: no params/body.
- `GET /:companyId` and `POST /:companyId/restore`:
  - `companyId` must be `cuid`.
- `PATCH /me` body (at least one field required):
  - `companyType`
  - `name`
  - `countryCode` (length 2)
  - `city`
  - `address` (nullable)
  - `phone` (nullable)
  - `email` (nullable, email format)
  - `website` (nullable, URL)
  - `logoUrl` (nullable, URL)
  - `bannerUrl` (nullable, URL)
  - `bio` (nullable)
  - `foundedAt` (nullable date)
  - `employeeCount` (nullable int >= 0)
  - `isVerified`
  - `registrationNumber`
  - `vatNumber` (nullable)
  - `stripeCustomerId` (nullable)

## 7. Success response

- All endpoints return HTTP `200`.
- Read/update/delete/restore return company data selected by repository:
  - `id`, `companyType`, `name`, `registrationNumber`, `vatNumber`, `countryCode`, `city`, `address`, `phone`, `email`, `website`, `logoUrl`, `bannerUrl`, `bio`, `foundedAt`, `employeeCount`, `isVerified`, `stripeCustomerId`, `currentPlanId`, `subscriptionStatus`, `deletedAt`, `createdAt`, `updatedAt`.
- `GET /` returns array form: `[company]`.

## 8. Error cases

- `401 UNAUTHENTICATED`: missing/invalid auth.
- `403 FORBIDDEN`: role or scope violation.
- `403 COMPANY_REQUIRED`: company role/admin without company linkage.
- `404 COMPANY_NOT_FOUND`: target company not found/active.
- `400 COMPANY_NOT_DELETED`: restore called for active company.
- `409 COMPANY_FIELD_ALREADY_USED`: unique company field conflict during update.
- `400 VALIDATION_ERROR`: invalid params/body.

## 9. Invariants / business rules

- Company endpoints are tenant-scoped; caller can only read/write own company.
- `GET /:companyId` and restore path enforce strict `companyId === auth.companyId`.
- Drivers can read company data but cannot mutate company profile.
- Delete is soft delete (`deletedAt` set); restore clears `deletedAt`.
- Read queries use active company filter (`deletedAt: null`) except restore pre-check (`findAnyById`).

## 10. Breaking changes

- None from current implementation baseline.
- Returning list shape from `GET /` (single-element array) is part of current contract; changing to object would be breaking.

## 11. Test and UAT notes

- Direct integration coverage for detailed company endpoint behavior is limited in current suite.
- Related evidence:
  - `tests/integration/apiSmoke.spec.ts` (non-500 check)
  - `tests/integration/marketplaceEndToEnd.spec.ts` (company context exercised across flows)
- TODO/Needs verification:
  - Add dedicated integration tests for company authz/scope/update/delete/restore edge cases.

## 12. Changelog

- 2026-04-20: Created canonical companies contract from routes/validator/controller/service/repository and available integration evidence.

