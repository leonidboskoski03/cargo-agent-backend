---
title: Auth API Contract
doc_type: api-contract
status: active
owner: backend-platform
version: 1.0.0
review_status: code-derived
reviewed_at: 2026-04-20
source_legacy: docs/archive/2026/contracts/api-contracts-auth.md
summary: Canonical API contract for auth, sessions, registration wizard, password flows, and OTP challenge lifecycle.
---

# Auth API Contract

## 1. Scope

This contract defines the implemented auth/session API surface under `/api/v1/auth`.

Covered flows:

- Registration wizard and legacy registration.
- Login (password + optional MFA), session refresh, logout/session controls.
- Forgot/reset/change password.
- OTP request/verify/resend flows.

## 2. Global conventions

- Base prefix: `/api/v1/auth`
- Auth required: endpoint-specific (see roles section).
- Success envelope:

```json
{ "success": true, "data": {} }
```

- Error envelope:

```json
{
  "success": false,
  "error": { "code": "ERROR_CODE", "message": "message", "details": {} },
  "meta": { "traceId": "request-id" }
}
```

- Cookies are set/cleared on auth transitions:
  - Access cookie: `JWT_COOKIE_NAME`.
  - Refresh cookie: `JWT_REFRESH_COOKIE_NAME`.

## 3. Endpoint list

- `GET /`
- `POST /registration/start`
- `POST /registration/verify-otp`
- `POST /registration/complete-job-seeker`
- `POST /registration/complete-company`
- `POST /register` (legacy compatibility)
- `POST /login`
- `POST /login/verify-otp`
- `POST /refresh`
- `POST /logout`
- `POST /logout-all`
- `GET /sessions`
- `DELETE /sessions/:sessionId`
- `POST /forgot-password`
- `POST /reset-password`
- `POST /change-password`
- `POST /otp/request`
- `POST /otp/verify`
- `POST /otp/resend`

## 4. Per-endpoint purpose

- `GET /`: module readiness ping for auth module.
- `POST /registration/start`: start registration challenge and trigger OTP delivery.
- `POST /registration/verify-otp`: verify registration OTP challenge.
- `POST /registration/complete-job-seeker`: create `JOB_SEEKER` account from registration flow.
- `POST /registration/complete-company`: complete company + admin onboarding from registration flow.
- `POST /register`: backward-compatible registration path.
- `POST /login`: password login; returns authenticated user or MFA-required next action.
- `POST /login/verify-otp`: complete login by consuming a previously verified `LOGIN_MFA` challenge.
- `POST /refresh`: rotate/refresh access context using active refresh session.
- `POST /logout`: best-effort revoke current session by refresh cookie and clear cookies.
- `POST /logout-all`: revoke all user sessions.
- `GET /sessions`: list session metadata for account device/session management.
- `DELETE /sessions/:sessionId`: revoke one specific session.
- `POST /forgot-password`: start password reset flow without account enumeration.
- `POST /reset-password`: complete reset and invalidate prior sessions per auth policy.
- `POST /change-password`: change password while authenticated.
- `POST /otp/request`: request OTP for supported purpose/channel.
- `POST /otp/verify`: verify OTP challenge.
- `POST /otp/resend`: resend OTP with cooldown/attempt controls.

## 5. Roles allowed

- Public (no auth required):
  - `GET /`
  - `POST /registration/start`
  - `POST /registration/verify-otp`
  - `POST /registration/complete-job-seeker`
  - `POST /registration/complete-company`
  - `POST /register`
  - `POST /login`
  - `POST /login/verify-otp`
  - `POST /refresh`
  - `POST /logout`
  - `POST /forgot-password`
  - `POST /reset-password`
  - `POST /otp/request`
  - `POST /otp/verify`
  - `POST /otp/resend`

- Auth + active session required:
  - `POST /logout-all`
  - `GET /sessions`
  - `DELETE /sessions/:sessionId`
  - `POST /change-password`

## 6. Request shape

- `GET /`: no params/query/body.
- `POST /registration/start` body:
  - `kind` (`JOB_SEEKER` | `COMPANY`)
  - `firstName` (1..80)
  - `lastName` (1..80)
  - `email` (email)
  - `phone` (optional, 5..40)
  - `password` (8..120)
- `POST /registration/verify-otp` body:
  - `draftId` (cuid)
  - `code` (4..8)
- `POST /registration/complete-job-seeker` body:
  - `draftId` (cuid)
  - `countryCode` (2 chars, uppercased)
  - `city` (1..120)
  - `headline` (optional, 1..180)
  - `yearsExperience` (optional int 0..60)
  - `availability` (optional, 1..120)
  - `preferredRoutes` (optional string[], each 2..120, max 20)
- `POST /registration/complete-company` body:
  - `draftId` (cuid)
  - `companyName` (2..120)
  - `companyType` (Prisma `CompanyType`)
  - `registrationNumber` (3..100)
  - `address` (2..255)
  - `countryCode` (2 chars, uppercased)
  - `city` (1..120)
  - `vatNumber` (optional, 3..120)
  - `website` (optional URL)
  - `contactPhone` (optional, 5..40)
  - `companyEmail` (optional email)
  - `planCode` (`FREE` | `PRO`, default `FREE`)
- `POST /register` body:
  - `firstName`, `lastName`, `email`, `password`
  - `role` (defaults to `JOB_SEEKER`, non-`JOB_SEEKER` rejected by service)
  - `otpChallengeId` (min 8)
- `POST /login` body:
  - `email`
  - `password` (min 8)
- `POST /login/verify-otp` body:
  - `email`
  - `password` (min 8)
  - `otpChallengeId` (min 8)
- `POST /refresh`: empty body; refresh token is read from refresh cookie.
- `POST /logout`, `POST /logout-all`: empty body.
- `GET /sessions`: empty query/body.
- `DELETE /sessions/:sessionId`: path param `sessionId` (min 8).
- `POST /forgot-password` body:
  - `email`
- `POST /reset-password` body:
  - `otpChallengeId` (min 8)
  - `newPassword` (8..120)
- `POST /change-password` body:
  - `currentPassword` (8..120)
  - `newPassword` (8..120)
- `POST /otp/request` body:
  - `purpose` (`REGISTER_VERIFY` | `FORGOT_PASSWORD` | `CHANGE_PASSWORD` | `INVITE_ACCEPT` | `LOGIN_MFA`)
  - `channel` (`EMAIL` | `SMS`)
  - `email` (required when channel is `EMAIL`)
  - `phone` (required when channel is `SMS`)
- `POST /otp/verify` body:
  - `challengeId` (min 8)
  - `code` (4..8)
- `POST /otp/resend` body:
  - `challengeId` (min 8)

## 7. Success response

- All endpoints currently return HTTP `200` on success.
- `GET /` returns `{ module: "auth", status: "ready" }`.
- `POST /registration/start` returns:
  - `draftId`, `challengeId`, `expiresAt`, `code`, `nextAction`.
- `POST /registration/verify-otp` returns:
  - `draftId`, `kind`, `otpVerified: true`, `nextAction`.
- `POST /registration/complete-job-seeker` returns:
  - `user`, `nextAction`.
- `POST /registration/complete-company` returns:
  - `user`, `company`, `checkout` (`null` or checkout descriptor), `nextAction`.
- `POST /register` returns:
  - `user`, `nextAction`.
- `POST /login` returns one of:
  - authenticated form: `{ user }`
  - MFA form: `{ user, challengeId, expiresAt, code, nextAction }`
- `POST /login/verify-otp` returns `{ user }`.
- `POST /refresh` returns `{ message: "Session refreshed" }`.
- `POST /logout` returns `{ message: "Logged out" }`.
- `POST /logout-all` returns `{ message: "Logged out from all sessions" }`.
- `GET /sessions` returns `{ sessions: [...] }` with each session including:
  - `id`, `createdAt`, `lastUsedAt`, `expiresAt`, `ipAddress`, `userAgent`, `isCurrent`.
- `DELETE /sessions/:sessionId` returns:
  - `message`, `revokedSessionId`.
- `POST /forgot-password` returns generic message and may include challenge metadata:
  - `challengeId`, `expiresAt`, `code`, `nextAction`.
- `POST /reset-password` returns:
  - `message`, `nextAction`.
- `POST /change-password` returns:
  - `message`.
- `POST /otp/request` returns:
  - `accepted`, `challengeId`, `expiresAt`, `code`, `nextAction`.
- `POST /otp/verify` returns:
  - `success`, `challengeId`, `purpose`, `channel`, `nextAction`.
- `POST /otp/resend` returns:
  - `accepted`, `challengeId`, `expiresAt`, `code`, `nextAction`.

## 8. Error cases

- Common auth/session/password/otp error codes:
  - `400`: `VALIDATION_ERROR`, `OTP_REQUIRED`, `OTP_INVALID`, `OTP_EXPIRED`, `OTP_CONTEXT_MISMATCH`, `INVALID_CURRENT_PASSWORD`, `INVALID_REGISTRATION_ROLE`, `INVALID_REGISTRATION_KIND`, `REGISTRATION_DRAFT_EXPIRED`, `REGISTRATION_DRAFT_INVALID`, `OTP_DESTINATION_REQUIRED`, `OTP_INVALID_CONTEXT`
  - `401`: `UNAUTHENTICATED`, `INVALID_TOKEN`, `INVALID_REFRESH_TOKEN`, `INVALID_CREDENTIALS`
  - `404`: `REGISTRATION_DRAFT_NOT_FOUND`, `SESSION_NOT_FOUND`
  - `409`: `EMAIL_ALREADY_IN_USE`
  - `429`: `OTP_ATTEMPTS_EXCEEDED`, `OTP_RESEND_COOLDOWN`, `OTP_REQUEST_RATE_LIMITED`, `OTP_VERIFY_RATE_LIMITED`
  - `500`: `OTP_CHALLENGE_NOT_CREATED`
- `POST /logout` and `POST /refresh` use success `200` fallback messages instead of errors when no refresh cookie is present.

## 9. Invariants / business rules

- Registration wizard endpoints are canonical registration path.
- OTP lifecycle must enforce expiry, attempts, resend cooldown, and lockout semantics.
- Session list/revoke/logout-all flows are contractually stable for account security UI.
- Password reset must invalidate stale sessions according to auth policy.
- Frontend should propagate request trace identifiers (`x-request-id`/`traceId`) for support diagnostics.
- `POST /register` only supports `JOB_SEEKER`; company onboarding uses wizard endpoints.
- `POST /login/verify-otp` consumes a previously verified challenge; it does not accept OTP `code` directly.

## 10. Breaking changes

- No intentional breaking changes introduced in this pass.
- Contract/code mismatch triage:
  - `ACCEPTED`: `POST /logout` is public by design for best-effort cookie/session cleanup when refresh context is missing or stale.
  - `ACCEPTED`: `POST /login/verify-otp` keeps the current `email + password + otpChallengeId` shape for compatibility with the two-step login flow.
  - `ACCEPTED FOR NON-PROD ONLY`: `POST /forgot-password` may expose preview challenge metadata in non-production environments; production delivery-mode evidence remains gated by release blocker `RB-006`.

## 11. Test and UAT notes

- Integration evidence:
  - `tests/integration/authOtpFlows.spec.ts`
  - `tests/integration/authPasswordFlows.spec.ts`
  - `tests/integration/companyInvitesFlow.spec.ts` (invite-OTP dependent path)
  - `tests/integration/marketplaceEndToEnd.spec.ts`
- Verified behaviors include:
  - wizard registration (job seeker/company)
  - `REGISTER_VERIFY` OTP prerequisite for legacy register
  - login MFA branch and single-use challenge consumption
  - OTP cooldown/expiry/lockout/rotation behavior
  - password reset/change invalidating token-version-backed access
  - session listing and targeted revoke

## 12. Changelog

- 2026-04-19: Normalized from `docs/archive/2026/contracts/api-contracts-auth.md` into canonical contract structure.
- 2026-04-20: Reworked from migration-grade to implementation-grade using auth validators/controllers/services and integration tests.
- 2026-06-06: Added explicit triage states for surfaced auth contract/code mismatches.
