import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  cancelSubscriptionAtPeriodEnd,
  revertSubscriptionCancelAtPeriodEnd,
  createBillingPortalSession,
  createSubscriptionCheckoutSession,
  getMySubscription,
} from "./subscriptions.controller.js";
import {
  cancelRevertSubscriptionSchema,
  cancelSubscriptionSchema,
  createBillingPortalSessionSchema,
  createCheckoutSessionSchema,
  getMySubscriptionSchema,
} from "./subscriptions.validator.js";

export const subscriptionsRouter = Router();

subscriptionsRouter.get("/me", requireAuth, validate(getMySubscriptionSchema), getMySubscription);
subscriptionsRouter.post(
  "/checkout-session",
  requireAuth,
  validate(createCheckoutSessionSchema),
  createSubscriptionCheckoutSession,
);
subscriptionsRouter.post(
  "/cancel-at-period-end",
  requireAuth,
  validate(cancelSubscriptionSchema),
  cancelSubscriptionAtPeriodEnd,
);
subscriptionsRouter.post(
  "/cancel-revert",
  requireAuth,
  validate(cancelRevertSubscriptionSchema),
  revertSubscriptionCancelAtPeriodEnd,
);
subscriptionsRouter.post(
  "/portal-session",
  requireAuth,
  validate(createBillingPortalSessionSchema),
  createBillingPortalSession,
);

