import { createServer } from "node:http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { startJobs, stopJobs } from "./jobs/index.js";
import { buildApp } from "./app.js";
import { prisma } from "./shared/prisma/prismaClient.js";
import { closeRedisConnection } from "./shared/queue/redisConnection.js";

const app = buildApp();
const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Server started");
  startJobs();
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Graceful shutdown started");
  stopJobs();

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  await closeRedisConnection();
  await prisma.$disconnect();
  logger.info("Graceful shutdown completed");
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

