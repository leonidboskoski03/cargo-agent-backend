import { CompanyInviteStatus, UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { env } from "../../config/env.js";
import { Roles } from "../../shared/auth/permissions.js";
import { UsageService } from "../../shared/billing/usage.service.js";
import { AppError } from "../../shared/errors/AppError.js";
import { sendCompanyInviteEmail } from "./companyInvites.notifier.js";
import { CompanyInvitesRepository } from "./companyInvites.repository.js";

type AuthContext = {
  userId?: string;
  role?: UserRole;
  companyId?: string;
};

const INVITE_TTL_DAYS = 7;
const repo = new CompanyInvitesRepository();
const usageService = new UsageService();

function requireAuth(auth: AuthContext) {
  if (!auth.userId || !auth.role) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
}

function requireCompanyAdmin(auth: AuthContext) {
  requireAuth(auth);

  if (auth.role !== Roles.COMPANY_ADMIN || !auth.companyId) {
    throw new AppError(403, "FORBIDDEN", "Only company admins can perform this action");
  }
}

function parseInviteStatus(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === CompanyInviteStatus.PENDING || normalized === CompanyInviteStatus.ACCEPTED || normalized === CompanyInviteStatus.REVOKED || normalized === CompanyInviteStatus.EXPIRED) {
    return normalized as CompanyInviteStatus;
  }

  throw new AppError(400, "INVALID_INVITE_STATUS", "Invalid invite status filter");
}

export class CompanyInvitesService {
  async list(auth: AuthContext, query: { status?: string }) {
    requireCompanyAdmin(auth);
    const status = parseInviteStatus(query.status);

    return repo.listByCompany(auth.companyId as string, status);
  }

  async create(auth: AuthContext, input: { invitedEmail: string; targetRole: UserRole }) {
    requireCompanyAdmin(auth);

    const usage = await usageService.assertCanUse(auth.companyId as string, "TEAM_MEMBERS");
    if (!usage.allowed) {
      throw new AppError(403, "USAGE_LIMIT_REACHED", "Plan usage limit reached", {
        metric: "TEAM_MEMBERS",
        planCode: usage.planCode,
        used: usage.used,
        limit: usage.limit,
        periodStart: usage.periodStart,
        companyId: auth.companyId,
      });
    }

    if (input.targetRole !== UserRole.COMPANY_ADMIN && input.targetRole !== UserRole.COMPANY_DRIVER) {
      throw new AppError(400, "INVALID_INVITE_ROLE", "Invite role must be COMPANY_ADMIN or COMPANY_DRIVER");
    }

    const invitedEmail = input.invitedEmail.trim().toLowerCase();
    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const company = await repo.findCompanyById(auth.companyId as string);
    if (!company) {
      throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
    }

    const invite = await repo.createInvite({
      companyId: auth.companyId as string,
      invitedByUserId: auth.userId as string,
      invitedEmail,
      targetRole: input.targetRole,
      token,
      expiresAt,
    });

    const dispatch = await sendCompanyInviteEmail({
      toEmail: invitedEmail,
      companyName: company.name,
      targetRole: input.targetRole,
      token,
    });

    return {
      id: invite.id,
      companyId: invite.companyId,
      invitedEmail: invite.invitedEmail,
      targetRole: invite.targetRole,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      ...(dispatch.previewAcceptUrl ? { previewAcceptUrl: dispatch.previewAcceptUrl } : {}),
      ...(env.NODE_ENV !== "production" ? { acceptToken: token } : {}),
    };
  }

  async accept(auth: AuthContext, input: { token: string; otpChallengeId: string }) {
    requireAuth(auth);

    const user = await repo.findActiveUserById(auth.userId as string);
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    const invite = await repo.findByToken(input.token);
    if (!invite) {
      throw new AppError(404, "INVITE_NOT_FOUND", "Invite not found");
    }

    if (invite.status === CompanyInviteStatus.REVOKED) {
      throw new AppError(410, "INVITE_REVOKED", "Invite has been revoked");
    }

    if (invite.status === CompanyInviteStatus.ACCEPTED) {
      throw new AppError(409, "INVITE_ALREADY_ACCEPTED", "Invite has already been accepted");
    }

    if (invite.status === CompanyInviteStatus.EXPIRED) {
      throw new AppError(410, "INVITE_EXPIRED", "Invite has expired");
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      await repo.markInviteExpired(invite.id);
      throw new AppError(410, "INVITE_EXPIRED", "Invite has expired");
    }

    if (invite.status !== CompanyInviteStatus.PENDING) {
      throw new AppError(409, "INVITE_NOT_PENDING", "Invite is not pending");
    }

    if (user.email.toLowerCase() !== invite.invitedEmail.toLowerCase()) {
      throw new AppError(403, "INVITE_EMAIL_MISMATCH", "Invite is assigned to a different email");
    }

    const otpAccepted = await repo.consumeVerifiedInviteOtp({
      challengeId: input.otpChallengeId,
      userId: user.id,
      invitedEmail: invite.invitedEmail.toLowerCase(),
    });

    if (!otpAccepted) {
      throw new AppError(400, "OTP_REQUIRED", "A verified invite OTP is required before accepting invite");
    }

    const usage = await usageService.assertCanUse(invite.companyId, "TEAM_MEMBERS");
    if (!usage.allowed) {
      throw new AppError(403, "USAGE_LIMIT_REACHED", "Plan usage limit reached", {
        metric: "TEAM_MEMBERS",
        planCode: usage.planCode,
        used: usage.used,
        limit: usage.limit,
        periodStart: usage.periodStart,
        companyId: invite.companyId,
      });
    }

    try {
      return await repo.acceptInvite({
        inviteId: invite.id,
        acceptedByUserId: user.id,
        targetRole: invite.targetRole,
        companyId: invite.companyId,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "USER_ALREADY_IN_ANOTHER_COMPANY") {
        throw new AppError(409, "USER_ALREADY_IN_ANOTHER_COMPANY", "User already belongs to another company");
      }

      if (error instanceof Error && error.message === "INVITE_NOT_ACCEPTABLE") {
        throw new AppError(409, "INVITE_NOT_PENDING", "Invite is no longer pending and valid");
      }

      throw error;
    }
  }

  async revoke(auth: AuthContext, inviteId: string) {
    requireCompanyAdmin(auth);

    const invite = await repo.findById(inviteId);
    if (!invite) {
      throw new AppError(404, "INVITE_NOT_FOUND", "Invite not found");
    }

    if (invite.companyId !== auth.companyId) {
      throw new AppError(403, "FORBIDDEN", "You can only revoke invites from your own company");
    }

    if (invite.status !== CompanyInviteStatus.PENDING) {
      throw new AppError(409, "INVITE_NOT_PENDING", "Only pending invites can be revoked");
    }

    return repo.revokeInvite(inviteId);
  }
}

