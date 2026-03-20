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

