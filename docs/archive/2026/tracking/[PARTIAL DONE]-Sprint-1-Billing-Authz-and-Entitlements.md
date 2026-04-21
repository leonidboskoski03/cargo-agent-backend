# [PARTIAL DONE] Sprint 1 - Billing Authz and Entitlements

- Status: [PARTIAL DONE]
- Updated at: 2026-04-17 11:29:49 +02:00

## What this is

Sprint 1 secures the money path by enforcing who can mutate billing/subscription state and by enforcing real usage limits from DB-backed plan entitlements.

## What is implemented

- Subscription write routes are protected with `COMPANY_ADMIN` role checks.
- Plan feature and usage-limit middleware resolve from DB services (not spoofable request headers).
- Usage counters are present with monthly period keys and upsert-based increments.

## Why it matters

This prevents privilege escalation (non-admin mutating billing) and protects FREE/PRO rules from request spoofing.

## Remaining items

- Final boundary test pass for counter edge windows (month transitions/concurrency cases).
- One final verification sweep across all protected endpoints to confirm no bypasses remain.

