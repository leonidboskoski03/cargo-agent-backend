import { z } from "zod";
import { OtpChannel, OtpPurpose, UserRole } from "@prisma/client";

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().email(),
    password: z.string().min(8).max(120),
    role: z.nativeEnum(UserRole).default(UserRole.JOB_SEEKER),
    otpChallengeId: z.string().trim().min(8),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    password: z.string().min(8),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const loginVerifyOtpSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    password: z.string().min(8),
    otpChallengeId: z.string().trim().min(8),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const logoutSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({}),
});

export const refreshSessionSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({}),
});

export const logoutAllSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({}),
});

export const listSessionsSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({}),
});

export const revokeSessionSchema = z.object({
  body: z.object({}),
  params: z.object({
    sessionId: z.string().trim().min(8),
  }),
  query: z.object({}),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    otpChallengeId: z.string().trim().min(8),
    newPassword: z.string().min(8).max(120),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(8).max(120),
    newPassword: z.string().min(8).max(120),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const requestOtpSchema = z.object({
  body: z
    .object({
      purpose: z.nativeEnum(OtpPurpose),
      channel: z.nativeEnum(OtpChannel),
      email: z.string().trim().email().optional(),
      phone: z.string().trim().min(6).max(30).optional(),
    })
    .superRefine((value, ctx) => {
      if (value.channel === OtpChannel.EMAIL && !value.email) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "email is required for EMAIL channel", path: ["email"] });
      }
      if (value.channel === OtpChannel.SMS && !value.phone) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "phone is required for SMS channel", path: ["phone"] });
      }
    }),
  params: z.object({}),
  query: z.object({}),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    challengeId: z.string().trim().min(8),
    code: z.string().trim().min(4).max(8),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const resendOtpSchema = z.object({
  body: z.object({
    challengeId: z.string().trim().min(8),
  }),
  params: z.object({}),
  query: z.object({}),
});

