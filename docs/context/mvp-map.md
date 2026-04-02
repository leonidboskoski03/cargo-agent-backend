# MVP Map - Cargo Agent Backend

Last updated: 2026-04-02

## What We Are Building

A B2B SaaS logistics marketplace for truck transportation in the Balkans.

The platform connects:

- Carrier companies (transport companies with vehicles/drivers)
- Shipper companies (companies that need transport)

Goal: replace phone/manual brokerage workflows with a digital marketplace that is auditable, scalable, and monetizable.

## Core Actors

- Company Admin: manages company profile, users, subscriptions, billing, and marketplace activity
- Dispatcher/Team User: operational posting, bidding, and contract workflow (role-limited)
- Job Seeker: separate lane with profile, applications, and credit-based actions
- Platform Admin (internal): support and operational controls

## Core Domain Flows (Company Lane)

1. Registration + authentication
2. Company onboarding
3. Company users and permissions
4. Post/load creation
5. Bid/application on posts
6. Bid acceptance -> contract creation
7. Contract lifecycle updates
8. Company reviews after contract completion/cancellation

## Core Domain Flows (Job Seeker Lane)

1. Job seeker registration/profile
2. Job application submit/manage
3. Credit top-up (Stripe checkout)
4. Credit consumption for promoted actions/features

## MVP Feature Scope

### Must-have

- Auth with JWT + cookie sessions
- OTP challenge flows (registration/login MFA/forgot password)
- Company onboarding and team basics
- Marketplace lifecycle: post -> bid -> contract -> review
- Job seeker application lane
- Stripe billing foundations (plans/subscriptions + webhooks)
- Security baseline (helmet, cors, rate limiting, centralized error handling)
- Logging and operational diagnostics

### Nice-to-have (post-MVP)

- Advanced analytics dashboards
- Additional plans (yearly/trial/coupons)
- Deep search/recommendation improvements
- Rich internal admin console

## Commercial Model (Current Direction)

### Company plans

- FREE: limited usage/visibility/features
- PRO: expanded limits + promoted/analytics/alerts capability

### Billing principles

- Subscription belongs to company (not individual user)
- One current active subscription state per company
- Stripe as payment provider for paid lane
- Webhook-driven state sync with idempotency

## Technical Stack

- Node.js + Express
- PostgreSQL + Prisma ORM
- Zod validation
- JWT auth + cookie support
- Pino logging + request logging
- node-cron scheduled jobs
- BullMQ + Redis for async/background processing
- Stripe for checkout/webhooks

## Backend Architecture Shape

- Feature modules in `src/modules/*`
- Shared infrastructure in `src/shared/*`
- API runtime in `src/server.ts`
- Worker runtime in `src/worker.ts`
- Prisma schema/migrations in `prisma/*`
- Integration and unit tests in `tests/*`

## Security and Reliability Baseline

- Centralized error model and API response format
- OTP attempt limits, expiry, resend cooldown
- Session tracking and revocation support
- Optional strict session enforcement for sensitive routes
- Optional IP/User-Agent reset-password binding
- Webhook idempotency and queue-backed processing patterns

## Current Implementation Reality (Short)

- Not schema-only anymore: most core modules are implemented.
- Billing and monetization path is implemented at foundation level and now in hardening phase.
- Next major priority: tighten billing/entitlements enforcement and close production release gates.

## What This File Is For

Use this document as a compact handoff context for:

- new developers
- product discussions
- AI/chatbot sessions in future implementation chats

If sharing only one file for context, share this first.

