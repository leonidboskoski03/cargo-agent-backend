import { Worker } from "bullmq";
import { logger } from "../config/logger.js";
import { WebhooksService } from "../modules/webhooks/webhooks.service.js";
import type { BillingWebhookJobPayload } from "../shared/queue/billingWebhook.queue.js";
import { getRedisConnection } from "../shared/queue/redisConnection.js";
import { queueNames } from "../shared/queue/queueNames.js";

const service = new WebhooksService();

export function startBillingWebhookWorker() {
  const worker = new Worker<BillingWebhookJobPayload>(
    queueNames.billingWebhooks,
    async (job) => {
      await service.handleStripeEvent(job.data);
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    },
  );

  worker.on("completed", (job) => {
    logger.debug(
      {
        queue: queueNames.billingWebhooks,
        jobId: job.id,
        eventId: job.data.event.id,
        attemptsMade: job.attemptsMade,
      },
      "Billing webhook job completed",
    );
  });

  worker.on("failed", (job, error) => {
    logger.error(
      {
        queue: queueNames.billingWebhooks,
        jobId: job?.id,
        eventId: job?.data.event.id,
        attemptsMade: job?.attemptsMade,
        error,
      },
      "Billing webhook job failed",
    );
  });

  return worker;
}

