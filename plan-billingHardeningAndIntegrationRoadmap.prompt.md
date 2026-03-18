## Plan: Billing Hardening and Integration Roadmap

Prioritize a reliability-first billing slice: lock in webhook and queue behavior with tests, then connect plan/usage enforcement to real subscription data, add queue replay/visibility controls, and finally publish frontend-facing billing contracts. This order reduces regression risk while enabling UI integration against stable APIs and error semantics already present in `ok`/`AppError` response envelopes.

### Steps
1. [ ] Define billing reliability acceptance cases in [`src/modules/webhooks/webhooks.service.ts`](src/modules/webhooks/webhooks.service.ts), [`src/shared/queue/billingWebhook.queue.ts`](src/shared/queue/billingWebhook.queue.ts), and [`prisma/schema.prisma`](prisma/schema.prisma).
2. [ ] Build integration tests for idempotency, retries, and fallback paths in [`tests/integration/`](tests/integration/) using `buildApp`.
3. [ ] Implement plan and usage guard wiring via [`src/shared/middleware/requirePlanFeature.middleware.ts`](src/shared/middleware/requirePlanFeature.middleware.ts), [`src/shared/middleware/enforceUsageLimit.middleware.ts`](src/shared/middleware/enforceUsageLimit.middleware.ts), and `UsageCounter`.
4. [ ] Replace billing placeholders in [`src/modules/plans/plans.repository.ts`](src/modules/plans/plans.repository.ts), [`src/modules/billing/billing.repository.ts`](src/modules/billing/billing.repository.ts), and `UsageService`.
5. [ ] Add queue observability and replay surfaces around [`src/workers/billingWebhook.worker.ts`](src/workers/billingWebhook.worker.ts), [`src/shared/queue/queueNames.ts`](src/shared/queue/queueNames.ts), and webhook job lifecycle metadata.
6. [ ] Publish frontend billing contracts for [`src/modules/plans/plans.routes.ts`](src/modules/plans/plans.routes.ts), [`src/modules/subscriptions/subscriptions.routes.ts`](src/modules/subscriptions/subscriptions.routes.ts), and [`src/modules/billing/billing.routes.ts`](src/modules/billing/billing.routes.ts) with payload/error examples.

### Further Considerations
1. Should replay be API-driven or ops-only script? Option A: admin endpoint / Option B: worker CLI / Option C: both with RBAC.
2. How should frontend contracts be versioned? Option A: markdown spec / Option B: OpenAPI source / Option C: shared typed SDK package.
3. Should local webhook parsing fallback remain in [`src/shared/stripe/stripeSignature.ts`](src/shared/stripe/stripeSignature.ts)? Option A: keep for dev speed / Option B: strict signature in all environments.

