import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  adminAdjustJobSeekerCredits,
  createCreditCheckoutSession,
  getMyCheckoutSession,
  getMyUsage,
  getMyWallet,
  listCreditPacks,
  listMyTransactions,
} from "./jobSeekerBilling.controller.js";
import {
  adminAdjustCreditsSchema,
  createCheckoutSessionSchema,
  getCheckoutSessionSchema,
  getUsageSchema,
  getWalletSchema,
  listCreditPacksSchema,
  listTransactionsSchema,
} from "./jobSeekerBilling.validator.js";

export const jobSeekerBillingRouter = Router();

jobSeekerBillingRouter.get("/wallet", requireAuth, validate(getWalletSchema), asyncRoute(getMyWallet));
jobSeekerBillingRouter.get("/usage", requireAuth, validate(getUsageSchema), asyncRoute(getMyUsage));
jobSeekerBillingRouter.get("/packs", requireAuth, validate(listCreditPacksSchema), asyncRoute(listCreditPacks));
jobSeekerBillingRouter.get("/transactions", requireAuth, validate(listTransactionsSchema), asyncRoute(listMyTransactions));
jobSeekerBillingRouter.post(
  "/checkout-sessions",
  requireAuth,
  validate(createCheckoutSessionSchema),
  asyncRoute(createCreditCheckoutSession),
);
jobSeekerBillingRouter.get(
  "/checkout-sessions/:sessionId",
  requireAuth,
  validate(getCheckoutSessionSchema),
  asyncRoute(getMyCheckoutSession),
);
jobSeekerBillingRouter.post(
  "/admin/adjustments",
  requireAuth,
  validate(adminAdjustCreditsSchema),
  asyncRoute(adminAdjustJobSeekerCredits),
);

