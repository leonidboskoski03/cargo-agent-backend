import cron from "node-cron";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { startBillingJobs } from "./billing/index.js";
import { cleanupAuthStateJob } from "./maintenance/authCleanup.job.js";
import { cleanupMarketplaceStateJob } from "./maintenance/marketplaceCleanup.job.js";

let tasks: cron.ScheduledTask[] = [];

export function startJobs() {
  if (!env.CRON_ENABLED) {
    logger.info("Cron jobs are disabled");
    return;
  }

  tasks = [
    cron.schedule("*/10 * * * *", () => {
      void cleanupMarketplaceStateJob();
    }),
    cron.schedule("0 * * * *", () => {
      void cleanupAuthStateJob();
    }),
    ...startBillingJobs(),
  ];

  logger.info({ jobs: tasks.length }, "Cron jobs started");
}

export function stopJobs() {
  tasks.forEach((task) => task.stop());
  tasks = [];
}

