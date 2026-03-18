import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./shared/prisma/prismaClient.js";
import { closeRedisConnection } from "./shared/queue/redisConnection.js";
import { startBillingWebhookWorker } from "./workers/billingWebhook.worker.js";

if (!env.BULLMQ_ENABLED) {
  logger.warn("BULLMQ_ENABLED is false; worker process will exit");
  process.exit(0);
}

const billingWebhookWorker = startBillingWebhookWorker();
logger.info("Billing webhook worker started");

async function shutdown(signal: string) {
  logger.info({ signal }, "Worker graceful shutdown started");
  await billingWebhookWorker.close();
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

