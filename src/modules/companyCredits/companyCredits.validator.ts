import { z } from "zod";

const cuidParam = z.string().cuid();

export const emptyCompanyCreditsSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({}),
});

export const listCompanyCreditPacksSchema = z.object({
  params: z.object({}),
  query: z.object({ activeOnly: z.coerce.boolean().default(true) }),
  body: z.object({}),
});

export const listCompanyTransactionsSchema = z.object({
  params: z.object({}),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  body: z.object({}),
});

export const createCompanyCheckoutSessionSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({
    creditPackCode: z.string().trim().min(1).max(80),
    idempotencyKey: z.string().trim().min(8).max(120).optional(),
  }),
});

export const getCompanyCheckoutSessionSchema = z.object({
  params: z.object({ sessionId: cuidParam }),
  query: z.object({}),
  body: z.object({}),
});

export const adminAdjustCompanyCreditsSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({
    amountCredits: z.number().int().refine((value) => value !== 0, { message: "amountCredits must not be 0" }),
    reasonCode: z.string().trim().min(3).max(120),
  }),
});
