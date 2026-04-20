# API Contracts: Auth and Sessions

Last updated: 2026-04-17 11:29:49 +02:00
Status: [PARTIAL DONE]

This document freezes the MVP auth/session API surface for frontend integration.

## Base

- Prefix: `/api/v1/auth`
- Auth required: only where explicitly noted
- Response envelope:
  - success: `{ "success": true, "data": ... }`
  - error: `{ "success": false, "error": { "code", "message", "details" }, "meta": { "traceId" } }`

## Registration flow (wizard-ready)

- `POST /registration/start`
  - Starts registration challenge and triggers OTP challenge for destination.
- `POST /registration/verify-otp`
  - Verifies registration OTP challenge.
- `POST /registration/complete-job-seeker`
  - Completes account creation for `JOB_SEEKER` lane.
- `POST /registration/complete-company`
  - Completes company + admin account onboarding.

Legacy endpoint:

- `POST /register`
  - Backward-compatible registration path.

## Login and session flow

- `POST /login`
  - Password step. Can branch to OTP verification if MFA required for role.
- `POST /login/verify-otp`
  - Completes login with OTP challenge token.
- `POST /refresh`
  - Rotates/refreshes access token by active refresh session.
- `POST /logout`
  - Logs out current session (cookie/token context).
- `POST /logout-all` (auth required)
  - Revokes all user sessions.
- `GET /sessions` (auth required)
  - Lists active/revoked session metadata for account management UI.
- `DELETE /sessions/:sessionId` (auth required)
  - Revokes a specific session/device.

## Password and OTP flows

- `POST /forgot-password`
  - Begins reset challenge without account enumeration.
- `POST /reset-password`
  - Completes reset and revokes prior sessions according to auth policy.
- `POST /change-password` (auth required)
  - Changes password while authenticated.
- `POST /otp/request`
  - Generic OTP request for supported purpose/channel.
- `POST /otp/verify`
  - Generic OTP verification.
- `POST /otp/resend`
  - Resend OTP with cooldown/attempt enforcement.

## Frontend assumptions

- Frontend should propagate `x-request-id` in error reporting for support diagnostics.
- OTP screens must support retry/resend and lockout messaging.
- Session list/revoke UI can be safely built against current route set.
- Register wizard should target registration start/verify/complete endpoints as canonical path.

