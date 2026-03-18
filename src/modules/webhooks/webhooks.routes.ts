import express, { Router } from "express";
import { handleStripeWebhook } from "./webhooks.controller.js";

export const webhooksRouter = Router();

// Stripe requires raw request payload for signature verification.
webhooksRouter.post("/stripe", express.raw({ type: "application/json" }), handleStripeWebhook);

