import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { getDeliveryProviderStatus } from "./delivery.controller.js";

export const deliveryRouter = Router();

deliveryRouter.get("/status", requireAuth, asyncRoute(getDeliveryProviderStatus));
