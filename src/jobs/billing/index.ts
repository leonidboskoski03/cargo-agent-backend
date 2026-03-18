import cron from "node-cron";
import {
  cleanupStaleCheckoutSessionsJob,
} from "./cleanupStaleCheckout.job.js";
import { downgradeExpiredSubscriptionsJob } from "./downgradeExpired.job.js";
import { reconcileSubscriptionsJob } from "./reconcileSubscriptions.job.js";

export function startBillingJobs() {
  return [
    cron.schedule("*/30 * * * *", () => {
      void reconcileSubscriptionsJob();
    }),
    cron.schedule("0 * * * *", () => {
      void downgradeExpiredSubscriptionsJob();
    }),
    cron.schedule("0 3 * * *", () => {
      void cleanupStaleCheckoutSessionsJob();
    }),
  ];
}

