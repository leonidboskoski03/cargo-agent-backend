import { Router } from "express";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { prisma } from "../shared/prisma/prismaClient.js";

export const healthRouter = Router();

healthRouter.get("/live", (_req, res) => {
  res.status(200).json({ success: true, data: { status: "live" } });
});

healthRouter.get("/ready", async (_req, res) => {
  const checks: Record<string, "up" | "down" | "skipped"> = {
    database: "down",
    redis: "skipped",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "up";

    if (env.BULLMQ_ENABLED) {
      const redis = new Redis(env.REDIS_URL, {
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 1_500,
        maxRetriesPerRequest: 1,
      });

      try {
        await redis.connect();
        await redis.ping();
        checks.redis = "up";
      } finally {
        redis.disconnect();
      }
    }

    res.status(200).json({
      success: true,
      data: {
        status: "ready",
        queueEnabled: env.BULLMQ_ENABLED,
        checks,
      },
    });
  } catch (error) {
    const component = checks.database === "down" ? "database" : "redis";
    const message = error instanceof Error ? error.message : "Unknown readiness error";

    res.status(503).json({
      success: false,
      error: {
        code: "SERVICE_NOT_READY",
        message: `Readiness check failed for ${component}`,
      },
      data: {
        status: "not_ready",
        queueEnabled: env.BULLMQ_ENABLED,
        checks,
      },
      meta: {
        reason: message,
      },
    });
  }
});

