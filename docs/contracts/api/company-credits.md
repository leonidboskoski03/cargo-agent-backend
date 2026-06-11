---
title: Company Credits API Contract
doc_type: api-contract
status: active
owner: backend-platform
version: 1.0.0
review_status: code-derived
reviewed_at: 2026-06-08
summary: Company marketplace credit wallet, usage, packs, checkout, and transaction contract.
---

# Company Credits API Contract

Base prefix: `/api/v1/company-credits`.

Company credits are separate from job-seeker credits. Company plan quota is used first; company credits are spent only when included quota is exhausted.

## Endpoints

- `GET /wallet`: company users read company credit balance.
- `GET /usage`: company users read wallet plus job-post, transport-post, and vehicle-listing cost/quota metadata.
- `GET /packs?activeOnly=true`: company users list company credit packs.
- `GET /transactions?page=1&pageSize=20`: company users list company credit ledger rows.
- `POST /checkout-sessions`: `COMPANY_ADMIN` creates Stripe checkout for a credit pack.
- `GET /checkout-sessions/:sessionId`: company users read own company checkout session.
  - Frontend return/status route: `/company-credits/checkout/:sessionId`.
- `POST /admin/adjustments`: `COMPANY_ADMIN`, feature-flagged by `INTERNAL_ADMIN_ADJUSTMENTS_ENABLED`.

## Billing Metadata

Publishing endpoints may return `billing` with `mode`, `creditCost`, `walletBalanceCredits`, and quota context. `mode` is `INCLUDED_QUOTA` or `CREDITS`.

## Rules

- Draft records are free.
- First publish/open visibility consumes included quota or credits.
- Company transport post creation uses active-post plan quota first, then company credits.
- Company-created job posts and company vehicle listings use monthly included quota first, then company credits.
- Edit, delete, pause, close, sold/rented, and restore do not auto-refund or re-charge.
- Refunds are manual adjustment/support actions only.

## Errors

- `402 INSUFFICIENT_CREDITS`: quota exhausted and wallet has insufficient credits.
- `403 COMPANY_REQUIRED` or `403 FORBIDDEN`: role/company constraint failed.
- `500 BILLING_PROVIDER_NOT_CONFIGURED`: Stripe is not configured.
- `500 CREDIT_PACK_PRICE_NOT_CONFIGURED`: selected credit pack lacks Stripe price ID.
