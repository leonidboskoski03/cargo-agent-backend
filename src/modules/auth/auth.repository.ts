import { CompanyType, OtpChannel, OtpPurpose, OtpStatus, PlanCode, Prisma, RegistrationKind, SubscriptionStatus, UserRole } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

export class AuthRepository {
  async createRegistrationDraft(input: {
    kind: RegistrationKind;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    passwordHash: string;
    expiresAt: Date;
    otpChallengeId: string;
  }) {
    return prisma.registrationDraft.create({
      data: {
        kind: input.kind,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        passwordHash: input.passwordHash,
        expiresAt: input.expiresAt,
        otpChallengeId: input.otpChallengeId,
      },
      select: {
        id: true,
        kind: true,
        otpChallengeId: true,
        expiresAt: true,
        completedAt: true,
      },
    });
  }

  async findRegistrationDraftById(draftId: string) {
    return prisma.registrationDraft.findUnique({
      where: { id: draftId },
    });
  }

  async markRegistrationOtpVerified(draftId: string) {
    return prisma.registrationDraft.update({
      where: { id: draftId },
      data: {
        otpVerifiedAt: new Date(),
      },
      select: {
        id: true,
        kind: true,
      },
    });
  }

  async completeJobSeekerRegistration(input: {
    draftId: string;
    countryCode: string;
    city: string;
    headline?: string;
    yearsExperience?: number;
    availability?: string;
    preferredRoutes?: string[];
  }) {
    return prisma.$transaction(async (tx) => {
      const draft = await tx.registrationDraft.findUnique({ where: { id: input.draftId } });

      if (!draft || draft.completedAt || draft.kind !== RegistrationKind.JOB_SEEKER || !draft.otpVerifiedAt || draft.expiresAt <= new Date()) {
        return null;
      }

      const user = await tx.user.create({
        data: {
          firstName: draft.firstName,
          lastName: draft.lastName,
          email: draft.email,
          phone: draft.phone ?? null,
          passwordHash: draft.passwordHash,
          role: UserRole.JOB_SEEKER,
          companyId: null,
          countryCode: input.countryCode,
          city: input.city,
          headline: input.headline,
          yearsExperience: input.yearsExperience,
          availability: input.availability,
          preferredRoutes: input.preferredRoutes,
          tokenVersion: 1,
          emailVerifiedAt: draft.otpVerifiedAt,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          companyId: true,
          tokenVersion: true,
        },
      });

      await tx.registrationDraft.update({
        where: { id: draft.id },
        data: {
          countryCode: input.countryCode,
          city: input.city,
          headline: input.headline,
          yearsExperience: input.yearsExperience,
          availability: input.availability,
          preferredRoutes: input.preferredRoutes,
          completedAt: new Date(),
        },
      });

      return { user };
    });
  }

  async completeCompanyRegistration(input: {
    draftId: string;
    companyName: string;
    companyType: CompanyType;
    registrationNumber: string;
    address: string;
    countryCode: string;
    city: string;
    vatNumber?: string;
    website?: string;
    companyPhone?: string;
    companyEmail?: string;
    planCode: PlanCode;
  }) {
    return prisma.$transaction(async (tx) => {
      const draft = await tx.registrationDraft.findUnique({ where: { id: input.draftId } });
      if (!draft || draft.completedAt || draft.kind !== RegistrationKind.COMPANY || !draft.otpVerifiedAt || draft.expiresAt <= new Date()) {
        return null;
      }

      const freePlan = await tx.plan.findFirst({
        where: {
          code: PlanCode.FREE,
          isActive: true,
        },
        select: { id: true },
      });

      if (!freePlan) {
        throw new Error("FREE_PLAN_NOT_FOUND");
      }

      const company = await tx.company.create({
        data: {
          companyType: input.companyType,
          name: input.companyName,
          registrationNumber: input.registrationNumber,
          vatNumber: input.vatNumber,
          countryCode: input.countryCode,
          city: input.city,
          address: input.address,
          phone: input.companyPhone,
          email: input.companyEmail,
          website: input.website,
          currentPlanId: freePlan.id,
          subscriptionStatus: SubscriptionStatus.FREE,
        },
        select: {
          id: true,
          name: true,
          companyType: true,
          registrationNumber: true,
          countryCode: true,
          city: true,
          address: true,
          website: true,
          phone: true,
          email: true,
          currentPlanId: true,
          subscriptionStatus: true,
        },
      });

      await tx.subscription.create({
        data: {
          companyId: company.id,
          planId: freePlan.id,
          status: SubscriptionStatus.FREE,
          isCurrent: true,
          startsAt: new Date(),
          currentPeriodStart: new Date(),
        },
      });

      const user = await tx.user.create({
        data: {
          firstName: draft.firstName,
          lastName: draft.lastName,
          email: draft.email,
          phone: draft.phone ?? null,
          passwordHash: draft.passwordHash,
          role: UserRole.COMPANY_ADMIN,
          companyId: company.id,
          tokenVersion: 1,
          emailVerifiedAt: draft.otpVerifiedAt,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          companyId: true,
          tokenVersion: true,
        },
      });

      await tx.registrationDraft.update({
        where: { id: draft.id },
        data: {
          companyName: input.companyName,
          companyType: input.companyType,
          companyRegistrationNumber: input.registrationNumber,
          companyAddress: input.address,
          companyCountryCode: input.countryCode,
          companyCity: input.city,
          companyVatNumber: input.vatNumber,
          companyPhone: input.companyPhone,
          companyEmail: input.companyEmail,
          companyWebsite: input.website,
          selectedPlanCode: input.planCode,
          completedAt: new Date(),
        },
      });

      return { user, company };
    });
  }

  async findActiveUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: {
        email,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        companyId: true,
        tokenVersion: true,
        passwordHash: true,
        isActive: true,
      },
    });
  }

  async findAuthUserById(userId: string) {
    return prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        tokenVersion: true,
      },
    });
  }

  async findActiveUserByPhone(phone: string) {
    return prisma.user.findFirst({
      where: {
        phone,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        isActive: true,
      },
    });
  }

  async findActiveUserById(userId: string) {
    return prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        companyId: true,
        tokenVersion: true,
        isActive: true,
      },
    });
  }

  async createUser(input: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    role: UserRole;
  }) {
    return prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
        companyId: null,
        tokenVersion: 1,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        companyId: true,
        tokenVersion: true,
      },
    });
  }

  async createSession(input: {
    userId: string;
    refreshTokenHash: string;
    tokenVersionSnapshot: number;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.authSession.create({
      data: {
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        tokenVersionSnapshot: input.tokenVersionSnapshot,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  async findActiveSessionByRefreshHash(refreshTokenHash: string) {
    return prisma.authSession.findFirst({
      where: {
        refreshTokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findActiveSessionById(sessionId: string) {
    return prisma.authSession.findFirst({
      where: {
        id: sessionId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async rotateSessionRefreshToken(input: {
    sessionId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.authSession.update({
      where: { id: input.sessionId },
      data: {
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: input.expiresAt,
        lastUsedAt: new Date(),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  async revokeSessionById(sessionId: string, reason: string) {
    return prisma.authSession.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
  }

  async revokeSessionByRefreshHash(refreshTokenHash: string, reason: string) {
    return prisma.authSession.updateMany({
      where: {
        refreshTokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
  }

  async revokeAllSessionsForUser(userId: string, reason: string) {
    return prisma.authSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
  }

  async listActiveSessionsForUser(userId: string) {
    return prisma.authSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: {
        lastUsedAt: "desc",
      },
      select: {
        id: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
    });
  }

  async revokeSessionForUser(input: { userId: string; sessionId: string; reason: string }) {
    return prisma.authSession.updateMany({
      where: {
        id: input.sessionId,
        userId: input.userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokeReason: input.reason,
      },
    });
  }

  async incrementTokenVersion(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment: 1 },
      },
      select: {
        id: true,
        tokenVersion: true,
      },
    });
  }

  async createPasswordResetToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    requestedIp?: string;
    requestedAgent?: string;
  }) {
    return prisma.passwordResetToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        requestedIp: input.requestedIp,
        requestedAgent: input.requestedAgent,
      },
      select: {
        id: true,
      },
    });
  }

  async findValidPasswordResetToken(tokenHash: string) {
    return prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });
  }

  async consumePasswordResetAndRevokeSessions(input: {
    tokenId: string;
    userId: string;
    passwordHash: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.updateMany({
        where: {
          id: input.tokenId,
          userId: input.userId,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      if (token.count !== 1) {
        return { consumed: false };
      }

      await tx.user.update({
        where: {
          id: input.userId,
        },
        data: {
          passwordHash: input.passwordHash,
          passwordChangedAt: new Date(),
          tokenVersion: { increment: 1 },
        },
      });

      await tx.authSession.updateMany({
        where: {
          userId: input.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokeReason: "PASSWORD_RESET",
        },
      });

      return { consumed: true };
    });
  }

  async changePasswordAndRevokeSessions(input: {
    userId: string;
    passwordHash: string;
    keepSessionId?: string;
    reason: string;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: input.userId },
        data: {
          passwordHash: input.passwordHash,
          passwordChangedAt: new Date(),
          tokenVersion: { increment: 1 },
        },
      });

      await tx.authSession.updateMany({
        where: {
          userId: input.userId,
          revokedAt: null,
          ...(input.keepSessionId ? { id: { not: input.keepSessionId } } : {}),
        },
        data: {
          revokedAt: new Date(),
          revokeReason: input.reason,
        },
      });
    });
  }

  async cancelPendingOtpChallenges(input: { destination: string; purpose: OtpPurpose; channel: OtpChannel }) {
    return prisma.authOtpChallenge.updateMany({
      where: {
        destination: input.destination,
        purpose: input.purpose,
        channel: input.channel,
        status: OtpStatus.PENDING,
      },
      data: {
        status: OtpStatus.CANCELED,
      },
    });
  }

  async createOtpChallenge(input: {
    userId?: string;
    channel: OtpChannel;
    purpose: OtpPurpose;
    destination: string;
    codeHash: string;
    maxAttempts: number;
    nextResendAt: Date;
    expiresAt: Date;
    requestedIp?: string;
    requestedAgent?: string;
    provider: string;
    providerMessageId?: string;
  }) {
    return prisma.authOtpChallenge.create({
      data: {
        userId: input.userId,
        channel: input.channel,
        purpose: input.purpose,
        destination: input.destination,
        codeHash: input.codeHash,
        maxAttempts: input.maxAttempts,
        nextResendAt: input.nextResendAt,
        expiresAt: input.expiresAt,
        requestedIp: input.requestedIp,
        requestedAgent: input.requestedAgent,
        provider: input.provider,
        providerMessageId: input.providerMessageId,
      },
      select: {
        id: true,
        userId: true,
        channel: true,
        purpose: true,
        destination: true,
        expiresAt: true,
      },
    });
  }

  async findOtpChallengeById(challengeId: string) {
    return prisma.authOtpChallenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        userId: true,
        channel: true,
        purpose: true,
        destination: true,
        codeHash: true,
        status: true,
        attemptCount: true,
        maxAttempts: true,
        resendCount: true,
        nextResendAt: true,
        expiresAt: true,
      },
    });
  }

  async markOtpAttempt(challengeId: string, nextStatus?: OtpStatus) {
    return prisma.authOtpChallenge.update({
      where: { id: challengeId },
      data: {
        attemptCount: { increment: 1 },
        ...(nextStatus ? { status: nextStatus } : {}),
      },
      select: {
        id: true,
        attemptCount: true,
        maxAttempts: true,
        status: true,
      },
    });
  }

  async markOtpVerified(challengeId: string) {
    return prisma.authOtpChallenge.update({
      where: { id: challengeId },
      data: {
        status: OtpStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });
  }

  async rotateOtpCode(input: {
    challengeId: string;
    codeHash: string;
    expiresAt: Date;
    nextResendAt: Date;
    provider: string;
    providerMessageId?: string;
  }) {
    return prisma.authOtpChallenge.update({
      where: { id: input.challengeId },
      data: {
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        nextResendAt: input.nextResendAt,
        resendCount: { increment: 1 },
        provider: input.provider,
        providerMessageId: input.providerMessageId,
      },
      select: {
        id: true,
        destination: true,
        channel: true,
        purpose: true,
        expiresAt: true,
      },
    });
  }

  async markOtpExpired(challengeId: string) {
    return prisma.authOtpChallenge.updateMany({
      where: {
        id: challengeId,
        status: OtpStatus.PENDING,
      },
      data: {
        status: OtpStatus.EXPIRED,
      },
    });
  }

  async markUserContactVerified(input: { userId: string; channel: OtpChannel }) {
    return prisma.user.update({
      where: { id: input.userId },
      data: input.channel === OtpChannel.EMAIL ? { emailVerifiedAt: new Date() } : { phoneVerifiedAt: new Date() },
      select: { id: true },
    });
  }

  async consumeVerifiedOtpChallenge(input: {
    challengeId: string;
    purpose: OtpPurpose;
    destination?: string;
    userId?: string;
    channel?: OtpChannel;
  }) {
    const result = await prisma.authOtpChallenge.updateMany({
      where: {
        id: input.challengeId,
        status: OtpStatus.VERIFIED,
        purpose: input.purpose,
        expiresAt: { gt: new Date() },
        ...(input.destination ? { destination: input.destination } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.channel ? { channel: input.channel } : {}),
      },
      data: {
        status: OtpStatus.CANCELED,
      },
    });

    return result.count === 1;
  }

  async findOtpChallengeForInvite(input: { challengeId: string }) {
    return prisma.authOtpChallenge.findUnique({
      where: { id: input.challengeId },
      select: {
        id: true,
        userId: true,
        destination: true,
        purpose: true,
        channel: true,
        status: true,
        expiresAt: true,
      },
    });
  }

  isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}

