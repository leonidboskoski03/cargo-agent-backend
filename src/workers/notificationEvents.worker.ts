import { Worker } from "bullmq";
import { logger } from "../config/logger.js";
import { NotificationEventsService } from "../modules/notifications/notificationEvents.service.js";
import type { NotificationEventJobPayload } from "../shared/queue/notificationEvents.queue.js";
import { getRedisConnection } from "../shared/queue/redisConnection.js";
import { queueNames } from "../shared/queue/queueNames.js";

const service = new NotificationEventsService();

export function startNotificationEventsWorker() {
  const worker = new Worker<NotificationEventJobPayload>(
    queueNames.notificationEvents,
    async (job) => {
      await service.handleEvent(job.data);
    },
    {
      connection: getRedisConnection(),
      concurrency: 10,
    },
  );

  worker.on("completed", (job) => {
    logger.debug({ jobId: job.id, type: job.data.type }, "Notification event job completed");
  });

  worker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, type: job?.data.type, error }, "Notification event job failed");
  });

  return worker;
}

