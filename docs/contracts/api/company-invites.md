---
title: Company Invites API Contract
doc_type: api-contract
status: active
owner: backend-platform
version: 1.0.0
review_status: code-derived
reviewed_at: 2026-04-20
source_legacy: docs/archive/2026/contracts/api-contracts-company-invites.md
summary: Canonical API contract for company invite lifecycle endpoints.
---

# Company Invites API Contract

## 1. Scope

This contract defines implemented company invite endpoints used for team onboarding and membership linking.

## 2. Global conventions

- Base prefix: `/api/v1/company-invites`
- Auth required: yes for all endpoints in this contract.
- Success envelope:

```json
{ "success": true, "data": {} }
```

- Error envelope follows shared handler (`code`, `message`, optional `details`, `meta.traceId`).

## 3. Endpoint list

- `GET /`
- `POST /`
- `POST /accept`
- `POST /:inviteId/revoke`

## 4. Per-endpoint purpose

- `GET /`: list invites in caller company scope with optional status filter.
- `POST /`: create invite for target email + target role with plan-usage enforcement.
- `POST /accept`: accept invite token for authenticated user.
- `POST /:inviteId/revoke`: revoke invite before acceptance.

## 5. Roles allowed

- `GET /`: `COMPANY_ADMIN` only.
- `POST /`: `COMPANY_ADMIN` only.
- `POST /:inviteId/revoke`: `COMPANY_ADMIN` only.
- `POST /accept`: any authenticated user (email + OTP constraints apply).

## 6. Request shape

- `GET /` query:
  - `status` (optional string, parsed as one of `PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED`; invalid value -> `400 INVALID_INVITE_STATUS`)
- `POST /` body:
  - `invitedEmail` (email)
  - `targetRole` (`COMPANY_DRIVER` | `COMPANY_ADMIN`)
- `POST /accept` body:
  - `token` (20..200)
  - `otpChallengeId` (min 8)
- `POST /:inviteId/revoke` params:
  - `inviteId` (cuid)

## 7. Success response

- `GET /` returns HTTP `200` and invite rows ordered by `createdAt DESC` with:
  - invite fields from `CompanyInvite`
  - `invitedByUser` summary (`id`, `firstName`, `lastName`, `email`)
  - `acceptedByUser` summary (`id`, `firstName`, `lastName`, `email`)
- `POST /` returns HTTP `201`:
  - `id`, `companyId`, `invitedEmail`, `targetRole`, `status`, `expiresAt`, `createdAt`
  - `previewAcceptUrl` included in non-production notifier path
  - `acceptToken` included only when `NODE_ENV !== "production"`
- `POST /accept` returns HTTP `200`:
  - repository accept result (`user`, `invite`)
  - `nextAction`:
    - `type: "REFRESH_AUTH_SESSION"`
    - message instructing session refresh for new claims
- `POST /:inviteId/revoke` returns HTTP `200` and updated invite row.

## 8. Error cases

- `401 UNAUTHENTICATED`: missing/invalid auth where required.
- `403 FORBIDDEN`: non-admin access to list/create/revoke; cross-company revoke.
- `403 INVITE_EMAIL_MISMATCH`: authenticated user email does not match invite recipient.
- `403 USAGE_LIMIT_REACHED`: team-member entitlement blocked (`details.metric = TEAM_MEMBERS`).
- `404 USER_NOT_FOUND`: accepting user record missing/inactive.
- `404 INVITE_NOT_FOUND`: token/id not found.
- `409 INVITE_ALREADY_ACCEPTED`: invite already consumed.
- `409 INVITE_NOT_PENDING`: invite not in pending state / no longer acceptable.
- `409 USER_ALREADY_IN_ANOTHER_COMPANY`: accepting user already belongs to different company.
- `410 INVITE_REVOKED`: revoked invite token.
- `410 INVITE_EXPIRED`: expired invite token (also marks pending invite as expired when detected).
- `400 OTP_REQUIRED`: missing/unverified invite OTP for acceptance.
- `400 INVALID_INVITE_ROLE`: invite role outside admin/driver set.
- `400 INVALID_INVITE_STATUS`: invalid list filter value.
- `400 VALIDATION_ERROR`: request shape invalid.

## 9. Invariants / business rules

- Invite lifecycle is single-use and stateful (`PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED`).
- Accept flow must block reused/revoked/expired tokens.
- Accept flow must enforce invited email ownership.
- Invite creation enforces team-member usage limits and role/company constraints.
- Invite list/revoke must remain company-scoped.
- Accept flow requires previously verified `INVITE_ACCEPT` email OTP bound to:
  - accepting `userId`
  - invited email destination
  - `EMAIL` channel
- OTP used for acceptance is consumed (set to canceled) even if a later acceptance step fails.

## 10. Breaking changes

- No intentional breaking changes introduced in this pass.
- Contract/code mismatches surfaced:
  - Invite usage limit is enforced twice (`enforceUsageLimit` middleware and service-level check). Behavior is consistent, but duplicated enforcement may produce the same `USAGE_LIMIT_REACHED` via two paths.
  - In production mode, `acceptToken` is not returned in create response; clients must rely on outbound invite delivery/provider path.

## 11. Test and UAT notes

- Integration evidence:
  - `tests/integration/companyInvitesFlow.spec.ts`
  - `tests/integration/marketplaceEndToEnd.spec.ts`
- Verified behaviors include:
  - admin create/list/revoke
  - happy-path accept with verified OTP
  - failures: email mismatch, OTP required, OTP reuse, expired, revoked, already accepted
  - TEAM_MEMBERS usage-limit enforcement on create and accept paths

## 12. Changelog

- 2026-04-19: Normalized from `docs/archive/2026/contracts/api-contracts-company-invites.md` into canonical contract structure.
- 2026-04-20: Reworked from migration-grade to implementation-grade using validators/controllers/services/repository and integration tests.
