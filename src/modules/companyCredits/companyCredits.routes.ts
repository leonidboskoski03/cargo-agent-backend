import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  adminAdjustCompanyCredits,
  createCompanyCreditCheckoutSession,
  getCompanyCheckoutSession,
  getCompanyUsage,
  getCompanyWallet,
  listCompanyCreditPacks,
  listCompanyTransactions,
} from "./companyCredits.controller.js";
import {
  adminAdjustCompanyCreditsSchema,
  createCompanyCheckoutSessionSchema,
  emptyCompanyCreditsSchema,
  getCompanyCheckoutSessionSchema,
  listCompanyCreditPacksSchema,
  listCompanyTransactionsSchema,
} from "./companyCredits.validator.js";

export const companyCreditsRouter = Router();

companyCreditsRouter.get("/wallet", requireAuth, validate(emptyCompanyCreditsSchema), asyncRoute(getCompanyWallet));
companyCreditsRouter.get("/usage", requireAuth, validate(emptyCompanyCreditsSchema), asyncRoute(getCompanyUsage));
companyCreditsRouter.get("/packs", requireAuth, validate(listCompanyCreditPacksSchema), asyncRoute(listCompanyCreditPacks));
companyCreditsRouter.get("/transactions", requireAuth, validate(listCompanyTransactionsSchema), asyncRoute(listCompanyTransactions));
companyCreditsRouter.post("/checkout-sessions", requireAuth, validate(createCompanyCheckoutSessionSchema), asyncRoute(createCompanyCreditCheckoutSession));
companyCreditsRouter.get("/checkout-sessions/:sessionId", requireAuth, validate(getCompanyCheckoutSessionSchema), asyncRoute(getCompanyCheckoutSession));
companyCreditsRouter.post("/admin/adjustments", requireAuth, validate(adminAdjustCompanyCreditsSchema), asyncRoute(adminAdjustCompanyCredits));
