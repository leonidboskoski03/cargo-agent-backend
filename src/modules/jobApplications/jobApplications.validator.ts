import { z } from "zod";

export const listJobApplicationsSchema = z.object({
  query: z.object({}),
  params: z.object({}),
  body: z.object({}),
});

export const createJobApplicationSchema = z.object({
  query: z.object({}),
  params: z.object({}),
  body: z.object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().max(5000).optional(),
    preferredCountryCode: z.string().trim().length(2).optional(),
    preferredCity: z.string().trim().max(120).optional(),
    expectedPayAmount: z.number().positive().optional(),
    currency: z.string().trim().length(3).optional(),
  }),
});

export const updateJobApplicationSchema = z.object({
  query: z.object({}),
  params: z.object({
    jobApplicationId: z.string().trim().min(1),
  }),
  body: z
    .object({
      title: z.string().trim().min(3).max(160).optional(),
      description: z.string().trim().max(5000).nullable().optional(),
      preferredCountryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()).nullable().optional(),
      preferredCity: z.string().trim().max(120).nullable().optional(),
      expectedPayAmount: z.number().positive().nullable().optional(),
      currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).nullable().optional(),
      status: z.enum(["OPEN", "PAUSED", "CLOSED"]).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const mutateJobApplicationSchema = z.object({
  query: z.object({}),
  params: z.object({
    jobApplicationId: z.string().trim().min(1),
  }),
  body: z.object({}),
});

export const applyToJobApplicationSchema = z.object({
  query: z.object({}),
  params: z.object({
    jobApplicationId: z.string().trim().min(1),
  }),
  body: z.object({
    message: z.string().trim().max(2000).optional(),
  }),
});

export const listMySubmissionsSchema = z.object({
  query: z.object({}),
  params: z.object({
    jobApplicationId: z.string().trim().min(1),
  }),
  body: z.object({}),
});

export const promoteJobApplicationSchema = z.object({
  query: z.object({}),
  params: z.object({
    jobApplicationId: z.string().trim().min(1),
  }),
  body: z.object({
    days: z.number().int().min(1).max(30).optional(),
  }),
});

export const promoteSubmissionSchema = z.object({
  query: z.object({}),
  params: z.object({
    jobApplicationId: z.string().trim().min(1),
    submissionId: z.string().trim().min(1),
  }),
  body: z.object({
    days: z.number().int().min(1).max(30).optional(),
  }),
});

