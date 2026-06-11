import { BidStatus } from "@prisma/client";
import { z } from "zod";

const cuidParam = z.string().cuid();
const decimalLike = z.union([z.string().trim(), z.number()]);
const bidScopeSchema = z.enum(["received", "sent", "all"]);

function validateTiming(value: { estimatedPickupAt?: Date | null; estimatedDeliveryAt?: Date | null }, ctx: z.RefinementCtx) {
  if (value.estimatedPickupAt && value.estimatedDeliveryAt && value.estimatedDeliveryAt < value.estimatedPickupAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "estimatedDeliveryAt must be after estimatedPickupAt",
      path: ["estimatedDeliveryAt"],
    });
  }
}

export const listBidsSchema = z.object({
  params: z.object({}),
  query: z.object({
    scope: bidScopeSchema.default("all"),
    status: z.nativeEnum(BidStatus).optional(),
    postId: z.string().cuid().optional(),
  }),
  body: z.object({}),
});

export const getBidByIdSchema = z.object({
  params: z.object({
    bidId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const createBidSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z
    .object({
      postId: cuidParam,
      message: z.string().trim().max(2000).optional(),
      offeredPriceAmount: decimalLike.optional(),
      currency: z.string().trim().length(3),
      estimatedPickupAt: z.coerce.date().optional(),
      estimatedDeliveryAt: z.coerce.date().optional(),
    })
    .superRefine(validateTiming),
});

export const updateBidSchema = z.object({
  params: z.object({
    bidId: cuidParam,
  }),
  query: z.object({}),
  body: z
    .object({
      message: z.string().trim().max(2000).nullable().optional(),
      offeredPriceAmount: decimalLike.nullable().optional(),
      currency: z.string().trim().length(3).optional(),
      estimatedPickupAt: z.coerce.date().nullable().optional(),
      estimatedDeliveryAt: z.coerce.date().nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    })
    .superRefine((value, ctx) =>
      validateTiming(
        {
          estimatedPickupAt: value.estimatedPickupAt,
          estimatedDeliveryAt: value.estimatedDeliveryAt,
        },
        ctx,
      ),
    ),
});

export const changeBidStatusSchema = z.object({
  params: z.object({
    bidId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({
    status: z.nativeEnum(BidStatus),
  }),
});

export const boostBidSchema = z.object({
  params: z.object({
    bidId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({
    creditAmount: z.coerce.number().int().min(1),
  }),
});

export const deleteBidSchema = z.object({
  params: z.object({
    bidId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const restoreBidSchema = z.object({
  params: z.object({
    bidId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

