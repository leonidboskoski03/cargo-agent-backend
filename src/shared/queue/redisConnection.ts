import type { ConnectionOptions } from "bullmq";
import { env } from "../../config/env.js";

export function getRedisConnection(): ConnectionOptions {
  const redisUrl = new URL(env.REDIS_URL);

  return {
    host: redisUrl.hostname,
    port: redisUrl.port ? Number(redisUrl.port) : 6379,
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    tls: redisUrl.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

export async function closeRedisConnection() {
  // BullMQ manages connection lifecycles for queue/worker instances.
}

