import { z } from "zod";

export const getMySubscriptionSchema = z.object({
  query: z.object({}),
  params: z.object({}),
  body: z.object({}),
});

export const createCheckoutSessionSchema = z.object({
  query: z.object({}),
  params: z.object({}),
  body: z.object({
    planCode: z.enum(["FREE", "PRO"]).default("PRO"),
  }),
});

export const cancelSubscriptionSchema = z.object({
  query: z.object({}),
  params: z.object({}),
  body: z.object({
    reason: z.string().trim().max(500).optional(),
  }),
});

