---
title: Manual Stripe Sandbox Smoke
doc_type: release-evidence-template
status: pending
owner: release-owner
created: 2026-06-09
updated: 2026-06-09
summary: Human-filled evidence template for real Stripe sandbox checkout and webhook event IDs.
---

# Manual Stripe Sandbox Smoke

Use this file to record real Stripe sandbox proof from the dashboard, Stripe CLI listener, and Cargo Agent UI.

Do not paste API keys, webhook secrets, card numbers, or private customer data.

## Environment

- Date:
- Executor:
- Backend URL: `http://localhost:4000`
- Frontend URL: `http://localhost:5173`
- Stripe mode: `test`
- Stripe CLI listener command:
  - `stripe listen --forward-to http://localhost:4000/webhooks/stripe`
- Backend worker running:
  - `YES / NO`
- `/health/ready` captured:
  - `YES / NO`

## PRO Subscription Checkout

- Company/admin account used:
- Checkout session ID (`cs_test_...`):
- Stripe customer ID (`cus_...`, optional):
- Stripe subscription ID (`sub_...`, optional):
- Webhook event IDs (`evt_...`):
  - `checkout.session.completed`:
  - `customer.subscription.created`:
  - `invoice.payment_succeeded`:
- Cargo Agent result:
  - Subscription status:
  - Plan code:
  - Billing event row visible:
- Replay/duplicate behavior:
  - Duplicate event tested: `YES / NO`
  - Duplicate mutation observed: `YES / NO`

## Company Credits Checkout

- Company/admin account used:
- Credit pack:
- Checkout session ID (`cs_test_...`):
- Webhook event IDs (`evt_...`):
  - `checkout.session.completed`:
- Wallet balance before:
- Wallet balance after:
- Transaction ledger row visible:
- Replay/duplicate behavior:
  - Duplicate event tested: `YES / NO`
  - Duplicate credit observed: `YES / NO`

## Job Seeker Credits Checkout

- Job seeker account used:
- Credit pack:
- Checkout session ID (`cs_test_...`):
- Webhook event IDs (`evt_...`):
  - `checkout.session.completed`:
- Wallet balance before:
- Wallet balance after:
- Transaction ledger row visible:
- Replay/duplicate behavior:
  - Duplicate event tested: `YES / NO`
  - Duplicate credit observed: `YES / NO`

## Result

- Manual Stripe smoke status: `PENDING / PASS / FAIL`
- Notes:
