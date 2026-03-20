import { Queue } from "bullmq";
import { env } from "../../config/env.js";
import { getRedisConnection } from "./redisConnection.js";
import { queueNames } from "./queueNames.js";

export type NotificationEventJobPayload =
  | { type: "BID_ACCEPTED"; bidId: string }
  | { type: "CONTRACT_CREATED"; contractId: string }
  | { type: "REVIEW_PUBLISHED"; reviewId: string };

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

  const jobId =
    input.type === "BID_ACCEPTED"
      ? `bid:${input.bidId}`
      : input.type === "CONTRACT_CREATED"
        ? `contract:${input.contractId}`
        : `review:${input.reviewId}`;

  return getNotificationEventsQueue().add(input.type, input, { jobId });
}

