import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { listMyBillingEvents } from "./billing.controller.js";
import { listBillingEventsSchema } from "./billing.validator.js";

export const billingRouter = Router();

billingRouter.get("/events", requireAuth, validate(listBillingEventsSchema), asyncRoute(listMyBillingEvents));

