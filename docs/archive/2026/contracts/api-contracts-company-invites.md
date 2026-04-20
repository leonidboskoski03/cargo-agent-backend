# API Contracts: Company Invites

Last updated: 2026-04-17 11:29:49 +02:00
Status: [DONE]

This document freezes MVP invite endpoints used by company onboarding/team expansion.

## Base

- Prefix: `/api/v1/company-invites`
- Auth required: yes for all endpoints
- Envelope: standard API envelope used across backend

## Endpoints

- `GET /`
  - Lists invites in caller company scope.
  - Intended for company admin/team management screens.

- `POST /`
  - Creates an invite for target email + target role.
  - Enforces usage limits (`TEAM_MEMBERS`) and role/company constraints.

- `POST /accept`
  - Accepts invite token for authenticated user.
  - Hardening in place for used/revoked/expired tokens and mismatched email safeguards.

- `POST /:inviteId/revoke`
  - Revokes invite before acceptance.

## Frontend assumptions

- Invite link flow should pass invite token to authenticated accept screen.
- Accept flow should surface deterministic error states:
  - expired/revoked/already-used
  - email mismatch
  - missing OTP verification where required
- Team list screens can reuse invite list endpoint with local filtering by status.

