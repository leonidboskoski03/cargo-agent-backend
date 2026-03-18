import type Stripe from "stripe";
import { env } from "../../config/env.js";
import { AppError } from "../errors/AppError.js";
import { getStripeClient, getStripeWebhookSecret } from "./stripeClient.js";

function parseEventFallback(payload: Buffer): Stripe.Event {
  try {
    return JSON.parse(payload.toString("utf8")) as Stripe.Event;
  } catch {
    throw new AppError(400, "INVALID_WEBHOOK_PAYLOAD", "Webhook payload is not valid JSON");
  }
}

export function verifyAndConstructStripeEvent(signatureHeader: string | string[] | undefined, payload: Buffer): Stripe.Event {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    // Local fallback for early MVP environments when Stripe CLI is not configured yet.
    return parseEventFallback(payload);
  }

  const signatureValue = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  if (!signatureValue) {
    throw new AppError(400, "INVALID_WEBHOOK_SIGNATURE", "Missing Stripe signature header");
  }

  try {
    return getStripeClient().webhooks.constructEvent(payload, signatureValue, getStripeWebhookSecret());
  } catch {
    throw new AppError(400, "INVALID_WEBHOOK_SIGNATURE", "Stripe webhook signature verification failed");
  }
}

