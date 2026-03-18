import Stripe from "stripe";
import { env } from "../../config/env.js";
import { AppError } from "../errors/AppError.js";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError(500, "BILLING_PROVIDER_NOT_CONFIGURED", "Stripe secret key is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
      appInfo: {
        name: "cargo-agent-backend",
      },
    });
  }

  return stripeClient;
}

export function getStripeWebhookSecret() {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError(500, "BILLING_WEBHOOK_NOT_CONFIGURED", "Stripe webhook secret is not configured");
  }

  return env.STRIPE_WEBHOOK_SECRET;
}

export function isStripeConfigured() {
  return Boolean(env.STRIPE_SECRET_KEY);
}

