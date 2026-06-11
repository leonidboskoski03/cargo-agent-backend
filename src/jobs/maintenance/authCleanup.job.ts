import { OtpStatus } from "@prisma/client";
import { logger } from "../../config/logger.js";
import { prisma } from "../../shared/prisma/prismaClient.js";

const OTP_RETENTION_DAYS = 7;
const REGISTRATION_DRAFT_RETENTION_DAYS = 7;

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

export async function cleanupAuthStateJob(now = new Date()) {
  const expiredOtp = await prisma.authOtpChallenge.updateMany({
    where: {
      status: OtpStatus.PENDING,
      expiresAt: { lte: now },
    },
    data: { status: OtpStatus.EXPIRED },
  });

  const purgedOtp = await prisma.authOtpChallenge.deleteMany({
    where: {
      status: { in: [OtpStatus.CANCELED, OtpStatus.EXPIRED, OtpStatus.LOCKED] },
      expiresAt: { lt: daysAgo(OTP_RETENTION_DAYS) },
    },
  });

  const expiredSessions = await prisma.authSession.updateMany({
    where: {
      revokedAt: null,
      expiresAt: { lte: now },
    },
    data: {
      revokedAt: now,
      revokeReason: "SESSION_EXPIRED",
    },
  });

  const expiredRegistrationDrafts = await prisma.registrationDraft.deleteMany({
    where: {
      OR: [
        { completedAt: null, expiresAt: { lte: now } },
        { completedAt: { not: null }, updatedAt: { lt: daysAgo(REGISTRATION_DRAFT_RETENTION_DAYS) } },
      ],
    },
  });

  const result = {
    expiredOtp: expiredOtp.count,
    purgedOtp: purgedOtp.count,
    expiredSessions: expiredSessions.count,
    expiredRegistrationDrafts: expiredRegistrationDrafts.count,
  };

  logger.info(result, "Auth cleanup job completed");
  return result;
}
