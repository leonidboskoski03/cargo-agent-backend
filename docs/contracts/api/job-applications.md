---
title: Job Applications API Contract
doc_type: api-contract
status: active
owner: backend-platform
version: 1.0.0
review_status: code-derived
reviewed_at: 2026-04-20
source_legacy: none
summary: Canonical API contract for job-marketplace listings, owner lifecycle, submissions, and promotion flows.
---

# Job Applications API Contract

Monetization note: job-seeker applications already use free monthly apply quota first, then credits. Job-seeker-created looking listings and company-created job posts now use included publish quota first, then role-specific credits.

## 1. Scope

This contract defines job marketplace endpoints under `/api/v1/job-applications`.

Covered:

- Listing creation and feed retrieval.
- Listing owner update, status, soft-delete, and restore flows.
- Listing application/submission flows.
- Listing/submission promotion flows.
- Submission list for listing owner.

## 2. Global conventions

- Base prefix: `/api/v1/job-applications`
- Auth required: yes for all endpoints.
- Success envelope:

```json
{ "success": true, "data": {} }
```

- Error envelope follows shared handler (`code`, `message`, optional `details`, `meta.traceId`).

## 3. Endpoint list

- `GET /api/v1/job-applications`
- `GET /api/v1/job-applications/mine`
- `POST /api/v1/job-applications`
- `PATCH /api/v1/job-applications/:jobApplicationId`
- `DELETE /api/v1/job-applications/:jobApplicationId`
- `POST /api/v1/job-applications/:jobApplicationId/restore`
- `POST /api/v1/job-applications/:jobApplicationId/promote`
- `POST /api/v1/job-applications/:jobApplicationId/apply`
- `POST /api/v1/job-applications/:jobApplicationId/submissions/:submissionId/promote`
- `GET /api/v1/job-applications/:jobApplicationId/submissions`

## 4. Per-endpoint purpose

- `GET /`: lane-aware feed of open listings.
- `GET /mine`: listings created by authenticated user.
- `POST /`: create listing as job seeker or company user.
- `PATCH /:jobApplicationId`: update own listing fields or status.
- `DELETE /:jobApplicationId`: soft-delete own listing and close it.
- `POST /:jobApplicationId/restore`: restore own soft-deleted listing as paused.
- `POST /:jobApplicationId/promote`: promote own listing (job seeker only, credit spend).
- `POST /:jobApplicationId/apply`: submit application to listing with role-target restrictions.
- `POST /:jobApplicationId/submissions/:submissionId/promote`: promote own submission (job seeker only, credit spend).
- `GET /:jobApplicationId/submissions`: list submissions for own listing only.

## 5. Roles allowed

- `GET /`, `GET /mine`, `POST /`, `POST /:id/apply`: `JOB_SEEKER`, `COMPANY_ADMIN`, `COMPANY_DRIVER`.
- `PATCH /:id`, `DELETE /:id`, `POST /:id/restore`: listing owner only.
- `POST /:id/promote` and submission promotion endpoint: `JOB_SEEKER` only.
- `GET /:id/submissions`: any authenticated role only when listing owner is caller.
- Any other/unsupported role receives `403 FORBIDDEN`.

## 6. Request shape

- `GET /` and `GET /mine`: no params/query/body.
- `POST /` body:
  - `title` (required, min 3, max 160)
  - `description` (optional, max 5000)
  - `preferredCountryCode` (optional, length 2)
  - `preferredCity` (optional, max 120)
  - `expectedPayAmount` (optional, positive number)
  - `currency` (optional, length 3)
- `PATCH /:jobApplicationId`:
  - Params: `jobApplicationId` (required non-empty string)
  - Body: at least one of:
    - `title` (min 3, max 160)
    - `description` (nullable, max 5000)
    - `preferredCountryCode` (nullable, length 2)
    - `preferredCity` (nullable, max 120)
    - `expectedPayAmount` (nullable, positive number)
    - `currency` (length 3)
    - `status` (`OPEN`, `PAUSED`, `CLOSED`)
- `DELETE /:jobApplicationId`:
  - Params: `jobApplicationId`
  - Body: empty object.
- `POST /:jobApplicationId/restore`:
  - Params: `jobApplicationId`
  - Body: empty object.
- `POST /:jobApplicationId/apply`:
  - Params: `jobApplicationId` (required non-empty string)
  - Body: `message` (optional, max 2000)
- `POST /:jobApplicationId/promote`:
  - Params: `jobApplicationId`
  - Body: `days` (optional int `1..30`, default service behavior `7`)
- `POST /:jobApplicationId/submissions/:submissionId/promote`:
  - Params: `jobApplicationId`, `submissionId`
  - Body: `days` (optional int `1..30`, default service behavior `7`)
- `GET /:jobApplicationId/submissions`:
  - Params: `jobApplicationId`

## 7. Success response

- `POST /`: HTTP `201`, returns created `JobApplication` row.
- `PATCH /:id`: HTTP `200`, returns updated `JobApplication` row.
- `DELETE /:id`: HTTP `200`, returns soft-deleted row with `deletedAt` set and `status: CLOSED`.
- `POST /:id/restore`: HTTP `200`, returns restored row with `deletedAt: null` and `status: PAUSED`.
- `GET /`: HTTP `200`, returns feed list:
  - job seeker feed: open listings where `createdByCompanyId != null`.
  - company feed: open listings where `createdByCompanyId == null`.
  - ordering: `isPromoted DESC`, then `createdAt DESC`.
- `GET /mine`: HTTP `200`, returns listings created by caller, ordered promoted first.
- `POST /:id/apply`: HTTP `201`.
  - company applicant: returns created submission row.
  - job seeker applicant: returns submission plus `billing` metadata (`mode`, quota/credit fields).
- Promotion endpoints: HTTP `200`, return `{ id, isPromoted, promotedUntil, billing }`.
- `GET /:id/submissions`: HTTP `200`, promoted submissions first, then newest.

## 8. Error cases

- `401 UNAUTHENTICATED`: missing/invalid auth.
- `403 FORBIDDEN`: unsupported role or forbidden action.
- `403 COMPANY_REQUIRED`: company role action without `companyId`.
- `403 INVALID_APPLICATION_TARGET`:
  - job seeker attempts applying to non-company listing.
  - company user attempts applying to company listing.
- `404 JOB_APPLICATION_NOT_FOUND`: listing missing/hidden for operation.
- `404 SUBMISSION_NOT_FOUND`: submission missing/forbidden on promote.
- `400 JOB_APPLICATION_ALREADY_DELETED`: delete requested for an already-deleted listing.
- `400 JOB_APPLICATION_NOT_DELETED`: restore requested for an active listing.
- `400 CANNOT_APPLY_TO_OWN_LISTING`: self-application blocked.
- `402 INSUFFICIENT_CREDITS`: free quota exhausted and wallet insufficient, or promotion credits unavailable.
- `409 ALREADY_APPLIED`: unique submission conflict (`jobApplicationId + submittedByUserId`).
- `400 VALIDATION_ERROR`: invalid params/body.

## 9. Invariants / business rules

- Dual-lane apply targeting is strict:
  - `JOB_SEEKER` can apply only to company-created listings.
  - Company users can apply only to job-seeker-created listings.
- One submission per user per listing is enforced (unique constraint + `ALREADY_APPLIED`).
- Users cannot apply to their own listings.
- Feed visibility is lane-partitioned and status-filtered to `OPEN`.
- Public feed excludes soft-deleted listings.
- `/mine` returns caller-owned listings, including soft-deleted rows, so owners can restore them.
- Restore does not republish automatically; restored listings return as `PAUSED`.
- Edit/delete/restore do not refund or re-charge credits.
- Promotion and seeker submission monetization are credit-aware and transactional.
- Job seeker submission path applies free quota first, then credits.

## 10. Breaking changes

- None from current implementation baseline.
- Any future addition of pagination/filter query for feed endpoints is contract-impacting and should be versioned.

## 11. Test and UAT notes

- Integration coverage:
  - `tests/integration/jobApplicationsScenario.spec.ts`
  - `tests/integration/marketplaceEndToEnd.spec.ts`
  - `tests/integration/releaseSmokeChain.spec.ts`
- Verified behaviors include:
  - create/apply/list submissions flow
  - self-apply rejection
  - promoted ordering behavior
  - credit spend paths for apply and promotions
  - owner update/delete/restore lifecycle
- TODO/Needs verification:
  - explicit tests for `INVALID_APPLICATION_TARGET`, `ALREADY_APPLIED`, and `SUBMISSION_NOT_FOUND` branches in isolation.

## 12. Changelog

- 2026-06-08: Added owner update, status, soft-delete, and restore contract.
- 2026-04-20: Created canonical job applications contract from routes/validator/controller/service/repository and integration tests.

