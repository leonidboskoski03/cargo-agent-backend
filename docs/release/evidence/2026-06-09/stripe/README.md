---
title: Stripe Sandbox Evidence - 2026-06-09
doc_type: release-evidence
status: partial
owner: release-owner
created: 2026-06-09
updated: 2026-06-09
summary: Stripe sandbox readiness and webhook replay evidence for RB-003/G-003.
related_docs:
  - docs/release/stripe-sandbox-runbook.md
  - docs/release/evidence-map.md
  - docs/release/mvp-readiness.md
---

# Stripe Sandbox Evidence - 2026-06-09

## Status

- Gate: `G-003 Billing/webhook replay proof`
- Blocker: `RB-003`
- Current status: `PARTIAL`
- Release verdict impact: supporting evidence only; does not make release `GO`.

## Captured Automation

| Artifact | Purpose | Result |
|---|---|---|
| `stripe-sandbox-check.txt` | Confirms local Stripe test key, webhook signing mode, PRO price, credit-pack prices, and DB readiness. | `webhookSignatureMode: "signature-verification"` |
| `webhook-replay-tests.txt` | Runs subscription, company credit, and job seeker credit webhook replay/idempotency checks. | 3 files passed, 6 tests passed |

## Manual Stripe Smoke Evidence Still Needed

Paste real sandbox evidence into `manual-stripe-smoke.md` after completing Stripe checkout flows:

- PRO subscription checkout session ID: `cs_test_...`
- PRO subscription webhook event IDs: `evt_...`
- Company credit checkout session ID: `cs_test_...`
- Company credit webhook event IDs: `evt_...`
- Job seeker credit checkout session ID: `cs_test_...`
- Job seeker credit webhook event IDs: `evt_...`
- Stripe CLI listener output timestamp.
- Confirmation that duplicate/replayed events did not duplicate subscription or credit mutations.

## Notes

- Secrets are intentionally not recorded in this evidence folder.
- `FREE` plan has no Stripe price by design.
- Full release remains `NO-GO` until UAT, CI branch protection proof, delivery-mode waiver/provider proof, signoff, and contract adoption proof are complete.
