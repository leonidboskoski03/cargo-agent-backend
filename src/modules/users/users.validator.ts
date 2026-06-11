import { UserRole } from "@prisma/client";
import { z } from "zod";

const cuidParam = z.string().cuid();

export const getMeSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({}),
});

export const getMyProfileCompletionSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({}),
});

export const listUsersSchema = z.object({
  params: z.object({}),
  query: z.object({
    includeInactive: z.coerce.boolean().optional().default(false),
  }),
  body: z.object({}),
});

export const getUserByIdSchema = z.object({
  params: z.object({
    userId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const updateMyProfileSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z
    .object({
      firstName: z.string().trim().min(1).max(80).optional(),
      lastName: z.string().trim().min(1).max(80).optional(),
      phone: z.string().trim().min(5).max(40).nullable().optional(),
      imageUrl: z.string().trim().url().nullable().optional(),
      countryCode: z.string().trim().min(2).max(2).transform((value) => value.toUpperCase()).nullable().optional(),
      city: z.string().trim().min(1).max(120).nullable().optional(),
      headline: z.string().trim().min(1).max(180).nullable().optional(),
      yearsExperience: z.number().int().min(0).max(60).nullable().optional(),
      availability: z.string().trim().min(1).max(120).nullable().optional(),
      preferredRoutes: z.array(z.string().trim().min(2).max(120)).max(20).nullable().optional(),
      isActive: z.boolean().optional(),
      role: z.nativeEnum(UserRole).optional(),
      companyId: z.string().cuid().nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const updateUserMembershipSchema = z.object({
  params: z.object({
    userId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({
    role: z.nativeEnum(UserRole),
    companyId: z.string().cuid().nullable(),
  }),
});

export const deleteUserSchema = z.object({
  params: z.object({
    userId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const restoreUserSchema = z.object({
  params: z.object({
    userId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

