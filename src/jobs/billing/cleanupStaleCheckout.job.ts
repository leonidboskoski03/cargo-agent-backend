import { logger } from "../../config/logger.js";
import { prisma } from "../../shared/prisma/prismaClient.js";

export async function cleanupStaleCheckoutSessionsJob(now = new Date()) {
  const [subscriptionCheckouts, jobSeekerCheckouts, companyCreditCheckouts] = await Promise.all([
    prisma.checkoutSession.updateMany({
      where: {
        status: "CREATED",
        expiresAt: { lte: now },
      },
      data: { status: "EXPIRED" },
    }),
    prisma.jobSeekerCheckoutSession.updateMany({
      where: {
        status: "CREATED",
        expiresAt: { lte: now },
      },
      data: { status: "EXPIRED" },
    }),
    prisma.companyCreditCheckoutSession.updateMany({
      where: {
        status: "CREATED",
        expiresAt: { lte: now },
      },
      data: { status: "EXPIRED" },
    }),
  ]);

  const result = {
    subscriptionCheckouts: subscriptionCheckouts.count,
    jobSeekerCheckouts: jobSeekerCheckouts.count,
    companyCreditCheckouts: companyCreditCheckouts.count,
  };

  logger.info(result, "Stale checkout cleanup job completed");
  return result;
}

