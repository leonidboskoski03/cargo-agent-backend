import { CompanyInviteStatus, OtpChannel, OtpPurpose, OtpStatus, UserRole } from "@prisma/client";
import { prisma } from "../../shared/prisma/prismaClient.js";

export class CompanyInvitesRepository {
  async findCompanyById(companyId: string) {
    return prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async listByCompany(companyId: string, status?: CompanyInviteStatus) {
    return prisma.companyInvite.findMany({
      where: {
        companyId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        invitedByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        acceptedByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async createInvite(input: {
    companyId: string;
    invitedByUserId: string;
    invitedEmail: string;
    targetRole: UserRole;
    token: string;
    expiresAt: Date;
  }) {
    return prisma.companyInvite.create({
      data: {
        companyId: input.companyId,
        invitedByUserId: input.invitedByUserId,
        invitedEmail: input.invitedEmail,
        targetRole: input.targetRole,
        token: input.token,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findByToken(token: string) {
    return prisma.companyInvite.findFirst({
      where: {
        token,
      },
    });
  }

  async markInviteExpired(inviteId: string) {
    return prisma.companyInvite.updateMany({
      where: {
        id: inviteId,
        status: CompanyInviteStatus.PENDING,
      },
      data: {
        status: CompanyInviteStatus.EXPIRED,
      },
    });
  }

  async findById(inviteId: string) {
    return prisma.companyInvite.findUnique({ where: { id: inviteId } });
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
        role: true,
        companyId: true,
      },
    });
  }

  async acceptInvite(input: { inviteId: string; acceptedByUserId: string; targetRole: UserRole; companyId: string }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: input.acceptedByUserId },
        select: { id: true, companyId: true },
      });

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      if (user.companyId && user.companyId !== input.companyId) {
        throw new Error("USER_ALREADY_IN_ANOTHER_COMPANY");
      }

      const inviteUpdate = await tx.companyInvite.updateMany({
        where: {
          id: input.inviteId,
          status: CompanyInviteStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        data: {
          status: CompanyInviteStatus.ACCEPTED,
          acceptedByUserId: input.acceptedByUserId,
          acceptedAt: new Date(),
        },
      });

      if (inviteUpdate.count !== 1) {
        throw new Error("INVITE_NOT_ACCEPTABLE");
      }

      const updatedUser = await tx.user.update({
        where: { id: input.acceptedByUserId },
        data: {
          companyId: input.companyId,
          role: input.targetRole,
        },
        select: {
          id: true,
          email: true,
          role: true,
          companyId: true,
        },
      });

      const invite = await tx.companyInvite.findUniqueOrThrow({ where: { id: input.inviteId } });

      return { user: updatedUser, invite };
    });
  }

  async revokeInvite(inviteId: string) {
    return prisma.companyInvite.update({
      where: { id: inviteId },
      data: {
        status: CompanyInviteStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
  }

  async consumeVerifiedInviteOtp(input: { challengeId: string; userId: string; invitedEmail: string }) {
    const result = await prisma.authOtpChallenge.updateMany({
      where: {
        id: input.challengeId,
        userId: input.userId,
        destination: input.invitedEmail,
        channel: OtpChannel.EMAIL,
        purpose: OtpPurpose.INVITE_ACCEPT,
        status: OtpStatus.VERIFIED,
        expiresAt: { gt: new Date() },
      },
      data: {
        status: OtpStatus.CANCELED,
      },
    });

    return result.count === 1;
  }
}

