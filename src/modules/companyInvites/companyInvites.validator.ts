import { UserRole } from "@prisma/client";
import { z } from "zod";

const cuidParam = z.string().cuid();

export const listCompanyInvitesSchema = z.object({
  params: z.object({}),
  query: z.object({
    status: z.string().optional(),
  }),
  body: z.object({}),
});

export const createCompanyInviteSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({
    invitedEmail: z.string().trim().email(),
    targetRole: z.nativeEnum(UserRole).refine((role) => role === UserRole.COMPANY_DRIVER || role === UserRole.COMPANY_ADMIN, {
      message: "targetRole must be COMPANY_DRIVER or COMPANY_ADMIN",
    }),
  }),
});

export const revokeCompanyInviteSchema = z.object({
  params: z.object({
    inviteId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const acceptCompanyInviteSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({
    token: z.string().trim().min(20).max(200),
    otpChallengeId: z.string().trim().min(8),
  }),
});

