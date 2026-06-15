import { Queue } from "bullmq";
import { env } from "../../config/env.js";
import { getRedisConnection } from "./redisConnection.js";
import { queueNames } from "./queueNames.js";

export type CompanyVerificationJobPayload = {
  companyId: string;
};

let companyVerificationQueue: Queue<CompanyVerificationJobPayload> | undefined;

function getCompanyVerificationQueue(): Queue<CompanyVerificationJobPayload> {
  if (!companyVerificationQueue) {
    companyVerificationQueue = new Queue<CompanyVerificationJobPayload>(queueNames.companyVerification, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5_000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  return companyVerificationQueue;
}

export async function enqueueCompanyVerification(input: CompanyVerificationJobPayload) {
  if (!env.BULLMQ_ENABLED) {
    return null;
  }

  return getCompanyVerificationQueue().add("verify_company", input, {
    jobId: `company_verification__${input.companyId}`,
  });
}
