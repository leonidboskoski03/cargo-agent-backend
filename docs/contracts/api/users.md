---
title: Users API Contract
doc_type: api-contract
status: active
owner: backend-platform
version: 1.0.0
review_status: code-derived
reviewed_at: 2026-04-20
source_legacy: none
summary: Canonical API contract for user self profile, membership management, and soft-delete/restore behavior.
---

# Users API Contract

## 1. Scope

This contract defines user endpoints under `/api/v1/users`.

Covered:

- Self profile reads/updates.
- Profile-completion computation endpoint.
- Company-admin membership management.
- User soft delete/restore.

## 2. Global conventions

- Base prefix: `/api/v1/users`
- Auth required: yes for all endpoints.
- Success envelope:

```json
{ "success": true, "data": {} }
```

- Error envelope follows shared handler (`code`, `message`, optional `details`, `meta.traceId`).

## 3. Endpoint list

- `GET /api/v1/users`
- `GET /api/v1/users/me`
- `GET /api/v1/users/me/profile-completion`
- `GET /api/v1/users/:userId`
- `PATCH /api/v1/users/me`
- `PATCH /api/v1/users/:userId/membership`
- `DELETE /api/v1/users/:userId`
- `POST /api/v1/users/:userId/restore`

## 4. Per-endpoint purpose

- `GET /`: list users in caller context (company list for admin, self-only list for others).
- `GET /me`: fetch authenticated user profile.
- `GET /me/profile-completion`: return weighted completion score and next action.
- `GET /:userId`: fetch user when caller is self or same-company admin.
- `PATCH /me`: update personal profile fields (not role/company linkage).
- `PATCH /:userId/membership`: admin-only role + company assignment update.
- `DELETE /:userId`: soft-delete self or (admin) same-company target user.
- `POST /:userId/restore`: admin-only restore for soft-deleted same-company user.

## 5. Roles allowed

- All endpoints require authenticated user.
- `PATCH /:userId/membership` and `POST /:userId/restore`: `COMPANY_ADMIN` only.
- `GET /:userId`: allowed for target self, or `COMPANY_ADMIN` in same company.
- `DELETE /:userId`: self-delete allowed for authenticated user; non-self delete requires `COMPANY_ADMIN` in same company.

## 6. Request shape

- `GET /` query:
  - `includeInactive` (optional boolean, default `false`)
- `GET /:userId`, `DELETE /:userId`, `POST /:userId/restore`:
  - `userId` must be `cuid`.
- `PATCH /me` body (at least one field required):
  - `firstName`
  - `lastName`
  - `phone` (nullable)
  - `isActive`
  - `role` (present in validator but forbidden by service)
  - `companyId` (present in validator but forbidden by service)
- `PATCH /:userId/membership` body:
  - `role` (required `UserRole`)
  - `companyId` (required nullable `cuid`)

## 7. Success response

- All endpoints return HTTP `200`.
- User payload shape from repository select:
  - `id`, `companyId`, `role`, `firstName`, `lastName`, `email`, `phone`, `imageUrl`, `countryCode`, `city`, `headline`, `yearsExperience`, `availability`, `preferredRoutes`, `emailVerifiedAt`, `isActive`, `deletedAt`, `createdAt`, `updatedAt`.
- `GET /`:
  - `COMPANY_ADMIN`: returns company user list (`includeInactive` controls `isActive` filter).
  - Other authenticated users: returns array containing only caller.
- `GET /me/profile-completion` returns:
  - `percent`
  - `completedItems`
  - `missingItems`
  - `nextBestAction`

## 8. Error cases

- `401 UNAUTHENTICATED`: missing/invalid auth.
- `403 FORBIDDEN`: scope or role violation.
- `403 COMPANY_REQUIRED`: admin flow without company linkage.
- `403 FORBIDDEN_ROLE_COMPANY_MUTATION`: role/company linkage attempted via `PATCH /me`.
- `404 USER_NOT_FOUND`: target user missing or not active (or not found for restore path).
- `404 COMPANY_NOT_FOUND`: membership update references non-existent company.
- `400 SELF_MEMBERSHIP_CHANGE_FORBIDDEN`: admin attempts to change own membership.
- `400 INVALID_ROLE_FOR_PERSONAL_USER`: `companyId = null` with non-`JOB_SEEKER` role.
- `400 USER_NOT_DELETED`: restore called for active user.
- `400 VALIDATION_ERROR`: invalid params/query/body.

## 9. Invariants / business rules

- Role/company linkage can only be changed by company admin membership endpoint.
- `PATCH /me` allows `JOB_SEEKER` users to update independent profile fields (`imageUrl`, `countryCode`, `city`, `headline`, `yearsExperience`, `availability`, `preferredRoutes`); company users receive `403 FORBIDDEN_JOB_SEEKER_PROFILE_MUTATION` for those fields.
- Users without company linkage must have role `JOB_SEEKER`.
- Company admins can manage only users in their own company scope.
- `GET /:userId` enforces strict privacy: self or same-company admin only.
- Soft delete sets `deletedAt` and `isActive=false`; restore clears `deletedAt`.
- Profile-completion weighting changes by lane:
  - `JOB_SEEKER`: adds seeker-specific fields (`headline`, `yearsExperience`, `availability`, `preferredRoutes`).
  - Company roles: includes company profile completeness checks.

## 10. Breaking changes

- None from current implementation baseline.
- Any removal of current self-only fallback behavior for non-admin `GET /` is FE-impacting and requires contract versioning.

## 11. Test and UAT notes

- Integration evidence:
  - `tests/integration/marketplaceEndToEnd.spec.ts` validates `/users/me/profile-completion` in seeker flow.
  - `tests/integration/jobSeekerProfile.spec.ts` validates job seeker profile updates and company-user denial.
  - `tests/integration/apiSmoke.spec.ts` validates non-500 surface.
- TODO/Needs verification:
  - Add dedicated integration suite for membership authz matrix and delete/restore scope edge cases.

## 12. Changelog

- 2026-04-20: Created canonical users contract from routes/validator/controller/service/repository and available integration evidence.
- 2026-06-08: Added job seeker self-profile fields and image URL metadata to `PATCH /me`.

