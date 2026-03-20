import { Router } from "express";
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

jobSeekerBillingRouter.get("/wallet", requireAuth, validate(getWalletSchema), getMyWallet);
jobSeekerBillingRouter.get("/usage", requireAuth, validate(getUsageSchema), getMyUsage);
jobSeekerBillingRouter.get("/packs", requireAuth, validate(listCreditPacksSchema), listCreditPacks);
jobSeekerBillingRouter.get("/transactions", requireAuth, validate(listTransactionsSchema), listMyTransactions);
jobSeekerBillingRouter.post(
  "/checkout-sessions",
  requireAuth,
  validate(createCheckoutSessionSchema),
  createCreditCheckoutSession,
);
jobSeekerBillingRouter.get(
  "/checkout-sessions/:sessionId",
  requireAuth,
  validate(getCheckoutSessionSchema),
  getMyCheckoutSession,
);
jobSeekerBillingRouter.post(
  "/admin/adjustments",
  requireAuth,
  validate(adminAdjustCreditsSchema),
  adminAdjustJobSeekerCredits,
);

