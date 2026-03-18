import { Queue } from "bullmq";
import type Stripe from "stripe";
import { getRedisConnection } from "./redisConnection.js";
import { queueNames } from "./queueNames.js";

export type BillingWebhookJobPayload = {
  event: Stripe.Event;
  payload: string;
};

let billingWebhookQueue: Queue<BillingWebhookJobPayload> | undefined;

function getBillingWebhookQueue(): Queue<BillingWebhookJobPayload> {
  if (!billingWebhookQueue) {
    billingWebhookQueue = new Queue<BillingWebhookJobPayload>(queueNames.billingWebhooks, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 3_000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  return billingWebhookQueue;
}

export async function enqueueBillingWebhookJob(input: BillingWebhookJobPayload) {
  return getBillingWebhookQueue().add("stripe-event", input, {
    jobId: input.event.id,
  });
}

