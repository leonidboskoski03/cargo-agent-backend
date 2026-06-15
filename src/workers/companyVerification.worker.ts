import { Worker } from "bullmq";
import { logger } from "../config/logger.js";
import { CompaniesService } from "../modules/companies/companies.service.js";
import type { CompanyVerificationJobPayload } from "../shared/queue/companyVerification.queue.js";
import { getRedisConnection } from "../shared/queue/redisConnection.js";
import { queueNames } from "../shared/queue/queueNames.js";

const service = new CompaniesService();

export function startCompanyVerificationWorker() {
  const worker = new Worker<CompanyVerificationJobPayload>(
    queueNames.companyVerification,
    async (job) => {
      await service.processVerificationJob(job.data.companyId);
    },
    {
      connection: getRedisConnection(),
      concurrency: 3,
    },
  );

  worker.on("completed", (job) => {
    logger.debug(
      {
        queue: queueNames.companyVerification,
        jobId: job.id,
        companyId: job.data.companyId,
        attemptsMade: job.attemptsMade,
      },
      "Company verification job completed",
    );
  });

  worker.on("failed", (job, error) => {
    logger.error(
      {
        queue: queueNames.companyVerification,
        jobId: job?.id,
        companyId: job?.data.companyId,
        attemptsMade: job?.attemptsMade,
        error,
      },
      "Company verification job failed",
    );
  });

  return worker;
}
