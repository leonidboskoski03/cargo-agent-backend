import { z } from "zod";
import { queryBoolean } from "../../shared/validation/queryBoolean.js";

const cuidParam = z.string().cuid();

export const getWalletSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({}),
});

export const getUsageSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({}),
});

export const listCreditPacksSchema = z.object({
  params: z.object({}),
  query: z.object({
    activeOnly: queryBoolean().default(true),
  }),
  body: z.object({}),
});

export const listTransactionsSchema = z.object({
  params: z.object({}),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  body: z.object({}),
});

export const createCheckoutSessionSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({
    creditPackCode: z.string().trim().min(1).max(80),
    idempotencyKey: z.string().trim().min(8).max(120).optional(),
  }),
});

export const getCheckoutSessionSchema = z.object({
  params: z.object({
    sessionId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const adminAdjustCreditsSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({
    targetUserId: cuidParam,
    amountCredits: z.number().int().refine((value) => value !== 0, {
      message: "amountCredits must not be 0",
    }),
    reasonCode: z.string().trim().min(3).max(120),
  }),
});

