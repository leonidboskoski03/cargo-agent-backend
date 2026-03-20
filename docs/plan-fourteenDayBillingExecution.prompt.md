## Plan: 14-Day Billing Execution

This draft focuses on shipping monetization safely: first prove Stripe/BullMQ billing correctness with integration tests, then enforce FREE/PRO entitlements in core routes, then add queue observability/replay and stable frontend billing contracts. It prioritizes production risk reduction (idempotency, retries, reconciliation) over feature sprawl, so you can onboard paying companies with confidence and avoid data drift.

### Steps
1. Define billing test matrix for `webhooks` idempotency and state sync in [`src/modules/webhooks/webhooks.service.ts`](src/modules/webhooks/webhooks.service.ts), [`src/modules/webhooks/webhooks.controller.ts`](src/modules/webhooks/webhooks.controller.ts), and [`tests/integration/health.spec.ts`](tests/integration/health.spec.ts) expansion.
2. Implement integration tests for duplicate events, `customer.subscription.updated`, `invoice.payment_failed`, queue-on/off behavior, and retry safety using [`src/shared/queue/billingWebhook.queue.ts`](src/shared/queue/billingWebhook.queue.ts) and [`src/workers/billingWebhook.worker.ts`](src/workers/billingWebhook.worker.ts).
3. Replace billing placeholders with Prisma-backed reads/writes in [`src/modules/plans/plans.repository.ts`](src/modules/plans/plans.repository.ts), [`src/modules/billing/billing.repository.ts`](src/modules/billing/billing.repository.ts), and [`src/shared/billing/usage.service.ts`](src/shared/billing/usage.service.ts).
4. Enforce monetization in real endpoints by wiring `requirePlanFeature` and `enforceUsageLimit` in posts/bids/users flows from [`src/shared/middleware/requirePlanFeature.middleware.ts`](src/shared/middleware/requirePlanFeature.middleware.ts) and [`src/shared/middleware/enforceUsageLimit.middleware.ts`](src/shared/middleware/enforceUsageLimit.middleware.ts).
5. Add queue observability/recovery with structured lifecycle logs, replay path, and worker health signals in [`src/workers/billingWebhook.worker.ts`](src/workers/billingWebhook.worker.ts), [`src/worker.ts`](src/worker.ts), and [`src/config/logger.ts`](src/config/logger.ts).
6. Freeze frontend billing contracts and document examples for [`src/modules/plans/plans.routes.ts`](src/modules/plans/plans.routes.ts), [`src/modules/subscriptions/subscriptions.routes.ts`](src/modules/subscriptions/subscriptions.routes.ts), and [`src/modules/billing/billing.routes.ts`](src/modules/billing/billing.routes.ts) in [`docs/architecture.md`](docs/architecture.md).

### Further Considerations
1. Replay strategy choice: Option A admin API endpoint / Option B worker CLI command / Option C both with RBAC and audit logs.
2. Webhook signature policy: Option A strict in production only / Option B strict in all environments for parity.
3. Contract source of truth: Option A markdown in `docs/` now / Option B OpenAPI as canonical source next sprint.

