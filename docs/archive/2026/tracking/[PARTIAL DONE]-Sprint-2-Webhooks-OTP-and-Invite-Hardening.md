# [PARTIAL DONE] Sprint 2 - Webhooks, OTP and Invite Hardening

- Status: [PARTIAL DONE]
- Updated at: 2026-04-17 11:29:49 +02:00

## What this is

Sprint 2 hardens lifecycle correctness for Stripe webhook processing and auth challenge flows.

## What is implemented

- Invite acceptance hardening is in place (wrong-user, expired/revoked/used checks, OTP consumption checks).
- Webhook idempotency patterns are implemented in service/repository flow.
- OTP challenge APIs exist with request/verify/resend endpoints and dedicated rate-limit middleware.

## Why it matters

Money-path and identity-path bugs are the highest production risk. These controls reduce replay, abuse, and account-takeover vectors.

## Remaining items

- Final replay stress coverage and ops replay tooling polish.
- Final abuse-case test matrix verification for all OTP edge transitions.

