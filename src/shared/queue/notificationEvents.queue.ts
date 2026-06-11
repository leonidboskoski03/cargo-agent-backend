import { Queue } from "bullmq";
import { env } from "../../config/env.js";
import { getRedisConnection } from "./redisConnection.js";
import { queueNames } from "./queueNames.js";

export type NotificationEventJobPayload =
  | { type: "BID_SUBMITTED"; bidId: string }
  | { type: "BID_ACCEPTED"; bidId: string }
  | { type: "BID_REJECTED"; bidId: string }
  | { type: "CONTRACT_CREATED"; contractId: string }
  | { type: "CONTRACT_STATUS_CHANGED"; contractId: string; status: string; actorCompanyId: string }
  | { type: "REVIEW_PUBLISHED"; reviewId: string }
  | { type: "VEHICLE_MARKETPLACE_INQUIRY_CREATED"; inquiryId: string }
  | { type: "VEHICLE_MARKETPLACE_INQUIRY_RESPONDED"; inquiryId: string }
  | { type: "JOB_APPLICATION_SUBMITTED"; submissionId: string };

let notificationEventsQueue: Queue<NotificationEventJobPayload> | undefined;

function getNotificationEventsQueue(): Queue<NotificationEventJobPayload> {
  if (!notificationEventsQueue) {
    notificationEventsQueue = new Queue<NotificationEventJobPayload>(queueNames.notificationEvents, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 2_000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  return notificationEventsQueue;
}

export async function enqueueNotificationEvent(input: NotificationEventJobPayload) {
  if (!env.BULLMQ_ENABLED) {
    return null;
  }

  const jobId = (() => {
    if (input.type === "BID_SUBMITTED" || input.type === "BID_ACCEPTED" || input.type === "BID_REJECTED") {
      return `${input.type.toLowerCase()}__${input.bidId}`;
    }

    if (input.type === "CONTRACT_CREATED") {
      return `contract__${input.contractId}`;
    }

    if (input.type === "CONTRACT_STATUS_CHANGED") {
      return `contract_status__${input.contractId}__${input.status}__${input.actorCompanyId}`;
    }

    if (input.type === "REVIEW_PUBLISHED") {
      return `review__${input.reviewId}`;
    }

    if (input.type === "VEHICLE_MARKETPLACE_INQUIRY_CREATED" || input.type === "VEHICLE_MARKETPLACE_INQUIRY_RESPONDED") {
      return `${input.type.toLowerCase()}__${input.inquiryId}`;
    }

    return `job_application_submitted__${input.submissionId}`;
  })();

  return getNotificationEventsQueue().add(input.type, input, { jobId });
}

