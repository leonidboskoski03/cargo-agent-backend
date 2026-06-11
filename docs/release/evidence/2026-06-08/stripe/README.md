# Stripe Evidence - 2026-06-08

Status: `PARTIAL`

This folder records staging support created on 2026-06-08. It is not sufficient to close `RB-003`.

## Automation Available

- `npm run stripe:sandbox:bootstrap` creates/reuses Stripe test-mode prices and maps them to local DB records.
- `npm run stripe:sandbox:check` reports key, webhook, price, and DB readiness without exposing secrets.
- `npm run test:evidence:webhooks` validates local idempotency for subscription, company credit, and job seeker credit webhook paths.
- `GET /api/v1/billing/readiness` exposes boolean-only readiness for frontend release diagnostics.

## Manual Evidence Still Required

- Stripe CLI listener proof with `STRIPE_WEBHOOK_SECRET` configured locally.
- Stripe test event IDs such as `evt_...`.
- Stripe checkout session IDs such as `cs_test_...`.
- Worker startup logs showing `billing_webhooks` queue processing when `BULLMQ_ENABLED=true`.
- Replay proof showing duplicate Stripe events do not duplicate subscription or credit mutations.

Do not mark release `GO` from this folder alone.
