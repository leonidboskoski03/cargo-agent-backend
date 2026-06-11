---
title: Stripe Sandbox Runbook
doc_type: release-runbook
status: active
owner: backend-platform
created: 2026-06-08
updated: 2026-06-08
summary: Test-mode Stripe setup and evidence capture steps for subscriptions, job-seeker credits, company credits, and webhook replay safety.
related_docs:
  - docs/release/evidence-map.md
  - docs/release/mvp-readiness.md
  - docs/contracts/api/company-billing-subscriptions.md
  - docs/contracts/api/job-seeker-billing.md
  - docs/contracts/api/company-credits.md
source_of_truth: false
---

# Stripe Sandbox Runbook

This runbook is for Stripe test mode only. Do not use live keys for MVP staging evidence.

## Required Stripe test-mode values

Set these in the backend environment:

- `STRIPE_SECRET_KEY`: test secret key, expected prefix `sk_test_`.
- `STRIPE_WEBHOOK_SECRET`: webhook signing secret from Stripe CLI or Dashboard, expected prefix `whsec_`.
- `STRIPE_PRO_MONTHLY_PRICE_ID`: monthly recurring price for the company `PRO` plan.
- `STRIPE_CHECKOUT_SUCCESS_URL`: frontend success URL.
- `STRIPE_CHECKOUT_CANCEL_URL`: frontend cancel URL.
- `BILLING_PORTAL_RETURN_URL`: frontend return URL for Stripe Billing Portal.

Database-seeded records also need Stripe test price IDs before checkout can work:

- `Plan.code = PRO` needs `stripePriceId`.
- `JobSeekerCreditPack` records `JS_CREDITS_10`, `JS_CREDITS_30`, `JS_CREDITS_70` need `stripePriceId`.
- `CompanyCreditPack` records `CO_CREDITS_10`, `CO_CREDITS_30`, `CO_CREDITS_70` need `stripePriceId`.

Run the local readiness report:

```powershell
npm run stripe:sandbox:check
```

The command prints JSON showing key presence, webhook signature mode, DB connectivity, and which plan/pack records are missing Stripe price IDs. It does not call Stripe and does not create charges.

The authenticated app also exposes boolean-only readiness at:

```text
GET /api/v1/billing/readiness
```

This endpoint is used by the frontend billing and release-readiness screens. It never returns raw Stripe keys, webhook secrets, or price IDs.

After `STRIPE_SECRET_KEY` is set to a test key, the sandbox catalog can be created and mapped automatically:

```powershell
npm run stripe:sandbox:bootstrap
```

The bootstrap command creates or reuses Stripe test-mode prices using stable lookup keys, then writes the resulting `price_...` IDs into the local database for the `PRO` plan, job seeker credit packs, and company credit packs. It refuses to run with a non-test secret key.

## Stripe Dashboard setup

Create test-mode products/prices manually only if you do not use `npm run stripe:sandbox:bootstrap`:

- Cargo Agent Pro subscription: recurring monthly, EUR.
- Job seeker credit packs: one-time prices for 10, 30, and 70 credits.
- Company credit packs: one-time prices for 10, 30, and 70 credits.

Copy each `price_...` into the corresponding environment variable or database record. Keep screenshots/links as evidence if this run is used for release proof.

## Local webhook forwarding

Start API and worker:

```powershell
npm run infra:up
npm run dev
npm run dev:worker
```

In another terminal, forward Stripe events:

```powershell
stripe listen --forward-to http://localhost:4000/webhooks/stripe
```

Copy the emitted `whsec_...` value into `STRIPE_WEBHOOK_SECRET` and restart the API. With `STRIPE_WEBHOOK_SECRET` set, backend webhook handling requires Stripe signature verification.

Expected money-path events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Replay evidence

Automated local evidence:

```powershell
npm run test:evidence:webhooks
```

Release evidence must also retain real Stripe test artifacts:

- Stripe event IDs, for example `evt_...`.
- Checkout session IDs, for example `cs_test_...`.
- Worker logs showing queued and processed webhook jobs when `BULLMQ_ENABLED=true`.
- Replay output showing duplicate Stripe events do not duplicate subscription or credit mutations.

Record artifacts under `docs/release/evidence/<date>/stripe/` and link them from `docs/release/evidence-map.md`.

## Current release status

This runbook supports `RB-003`, but it does not close it by itself. `RB-003` becomes ready only after the automated command output and real Stripe test event/replay artifacts are linked.
