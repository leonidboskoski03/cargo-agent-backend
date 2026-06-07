---
title: Fleet API Contract
doc_type: api-contract
status: active
owner: backend-platform
version: 1.0.0
review_status: code-derived
reviewed_at: 2026-06-05
source_legacy: none
summary: Canonical API contract for company vehicles, driver licenses, and vehicle assignments.
---

# Fleet API Contract

## Scope

Defines implemented fleet operations under `/api/v1/vehicles`, `/api/v1/licenses`, and `/api/v1/vehicle-assignments`.

## Global conventions

- Auth required: yes.
- Success envelope: `{ "success": true, "data": ... }`.
- Error envelope includes `error.code`, `error.message`, optional `error.details`, and `meta.traceId`.
- Company admins can mutate company fleet records.
- Company drivers can view company fleet context but cannot mutate vehicles, licenses, or assignments.
- Job seekers retain personal vehicle/license/assignment behavior where implemented.

## Endpoints

- Vehicles:
  - `GET /api/v1/vehicles`
  - `GET /api/v1/vehicles/:vehicleId`
  - `POST /api/v1/vehicles`
  - `PATCH /api/v1/vehicles/:vehicleId`
  - `DELETE /api/v1/vehicles/:vehicleId`
  - `POST /api/v1/vehicles/:vehicleId/restore`
- Licenses:
  - `GET /api/v1/licenses/types`
  - `GET /api/v1/licenses?userId=...`
  - `GET /api/v1/licenses/:licenseId`
  - `POST /api/v1/licenses`
  - `PATCH /api/v1/licenses/:licenseId`
  - `DELETE /api/v1/licenses/:licenseId`
  - `POST /api/v1/licenses/:licenseId/restore`
- Vehicle assignments:
  - `GET /api/v1/vehicle-assignments`
  - `GET /api/v1/vehicle-assignments/:assignmentId`
  - `POST /api/v1/vehicle-assignments`
  - `PATCH /api/v1/vehicle-assignments/:assignmentId`
  - `DELETE /api/v1/vehicle-assignments/:assignmentId`
  - `POST /api/v1/vehicle-assignments/:assignmentId/restore`

## Request and response notes

- Vehicle create/update validates type, plate, two-letter registration country, optional brand/model/year/capacity/volume/body type, image URL, document metadata JSON, refrigerated, hazmat, and active flags.
- `GET /api/v1/licenses/types` returns supported license type codes and labels for frontend dropdowns.
- License create/update validates license type against the supported catalog and optional image/document URLs plus issued/expiry dates; expiry must be after issued date.
- Assignment create/update validates vehicle, driver, start/end window; overlapping active assignments for the same driver return conflict.
- List endpoints return raw selected Prisma records ordered by module repository rules; no pagination metadata is returned.
- Soft-deleted records are excluded from list/get and can be restored by company admins in the owning company.

## Error cases

- `401 UNAUTHENTICATED`: missing auth.
- `403 FORBIDDEN`: role or tenant scope violation.
- `403 COMPANY_REQUIRED`: company user missing company context.
- `404 *_NOT_FOUND`: target record missing, deleted, or out of accessible scope.
- `400 *_NOT_DELETED`: restore requested for an active record.
- `409 DUPLICATE_VEHICLE`: duplicate plate/country.
- `409 DUPLICATE_LICENSE`: duplicate license type for the user.
- `409 DRIVER_ALREADY_ASSIGNED`: overlapping assignment.
- `400 VALIDATION_ERROR`: request schema failure.
- `400 UNSUPPORTED_LICENSE_TYPE`: service-level unsupported license type guard for non-HTTP callers.

## Test evidence

- `tests/integration/fleetCloseout.spec.ts`
- `tests/integration/apiSmoke.spec.ts`

## Changelog

- 2026-06-05: Created canonical fleet API contract and aligned company-driver mutation behavior with frontend release plan.
- 2026-06-06: Documented license type catalog endpoint and vehicle/license media metadata behavior.
