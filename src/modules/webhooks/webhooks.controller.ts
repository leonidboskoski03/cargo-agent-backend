import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { ok } from "../../shared/http/apiResponse.js";
import { enqueueBillingWebhookJob } from "../../shared/queue/billingWebhook.queue.js";
import { verifyAndConstructStripeEvent } from "../../shared/stripe/stripeSignature.js";
import { WebhooksService } from "./webhooks.service.js";

const service = new WebhooksService();

export async function handleStripeWebhook(req: Request, res: Response) {
  const payloadBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
  const event = verifyAndConstructStripeEvent(req.headers["stripe-signature"], payloadBuffer);
  const payload = payloadBuffer.toString("utf8");

  if (env.BULLMQ_ENABLED) {
    await enqueueBillingWebhookJob({ event, payload });
    return ok(res, { received: true, queued: true, eventId: event.id });
  }

  const data = await service.handleStripeEvent({
    event,
    payload,
  });

  return ok(res, data);
}

