# API Contracts: Company Billing and Subscriptions

Last updated: 2026-04-17 11:29:49 +02:00
Status: [PARTIAL DONE]

This document freezes MVP-facing billing/subscription endpoints for company lane integration.

## Base

- Billing events prefix: `/api/v1/billing`
- Subscription prefix: `/api/v1/subscriptions`
- Auth required: yes for all endpoints
- Mutation auth: `COMPANY_ADMIN` only for subscription write actions

## Billing endpoints

- `GET /api/v1/billing/events`
  - Lists billing events in caller company scope.
  - Supports pagination (`page`, `pageSize`).

## Subscription endpoints

- `GET /api/v1/subscriptions/me`
  - Returns current subscription state for caller company.

- `POST /api/v1/subscriptions/checkout-session`
  - Creates Stripe checkout session for plan change/activation.
  - Company admin only.

- `POST /api/v1/subscriptions/cancel-at-period-end`
  - Schedules cancellation at current period end.
  - Company admin only.

- `POST /api/v1/subscriptions/cancel-revert`
  - Reverts scheduled cancellation.
  - Company admin only.

- `POST /api/v1/subscriptions/portal-session`
  - Creates Stripe billing portal session.
  - Company admin only.

## Frontend assumptions

- Company driver/non-admin users must be blocked from subscription mutations.
- UI should treat webhook as source of truth for eventual subscription state transitions.
- Billing history UI can render directly from `/billing/events` with pagination.

