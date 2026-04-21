import express, { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { handleStripeWebhook } from "./webhooks.controller.js";

export const webhooksRouter = Router();

// Stripe requires raw request payload for signature verification.
webhooksRouter.post("/stripe", express.raw({ type: "application/json" }), asyncRoute(handleStripeWebhook));

