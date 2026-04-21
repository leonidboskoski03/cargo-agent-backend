import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./shared/prisma/prismaClient.js";
import { closeRedisConnection } from "./shared/queue/redisConnection.js";
import { startBillingWebhookWorker } from "./workers/billingWebhook.worker.js";
import { startNotificationEventsWorker } from "./workers/notificationEvents.worker.js";

if (!env.BULLMQ_ENABLED) {
  logger.warn("BULLMQ_ENABLED is false; worker process will exit");
  process.exit(0);
}

const redisTarget = new URL(env.REDIS_URL);

const billingWebhookWorker = startBillingWebhookWorker();
const notificationEventsWorker = startNotificationEventsWorker();
logger.info(
  {
    pid: process.pid,
    queues: ["billing_webhooks", "notification_events"],
    redisHost: redisTarget.hostname,
    redisPort: redisTarget.port ? Number(redisTarget.port) : 6379,
    redisTls: redisTarget.protocol === "rediss:",
  },
  "Worker process started",
);
logger.info({ pid: process.pid }, "Billing webhook worker started");
logger.info({ pid: process.pid }, "Notification events worker started");

async function shutdown(signal: string) {
  logger.info({ signal }, "Worker graceful shutdown started");
  await billingWebhookWorker.close();
  await notificationEventsWorker.close();
  await closeRedisConnection();
  await prisma.$disconnect();
  logger.info("Worker graceful shutdown completed");
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

