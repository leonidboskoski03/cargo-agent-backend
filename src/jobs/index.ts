import cron from "node-cron";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { startBillingJobs } from "./billing/index.js";

let tasks: cron.ScheduledTask[] = [];

export function startJobs() {
  if (!env.CRON_ENABLED) {
    logger.info("Cron jobs are disabled");
    return;
  }

  tasks = [
    cron.schedule("*/10 * * * *", () => {
      logger.info("cleanupExpiredPosts job placeholder");
    }),
    cron.schedule("*/10 * * * *", () => {
      logger.info("cleanupExpiredBids job placeholder");
    }),
    cron.schedule("0 * * * *", () => {
      logger.info("cleanupStaleSessions job placeholder");
    }),
    ...startBillingJobs(),
  ];

  logger.info({ jobs: tasks.length }, "Cron jobs started");
}

export function stopJobs() {
  tasks.forEach((task) => task.stop());
  tasks = [];
}

