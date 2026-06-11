import { ContractStatus } from "@prisma/client";
import { z } from "zod";

const cuidParam = z.string().cuid();

function validateWindow(value: { pickupPlannedAt?: Date; deliveryPlannedAt?: Date }, ctx: z.RefinementCtx) {
  if (value.pickupPlannedAt && value.deliveryPlannedAt && value.deliveryPlannedAt < value.pickupPlannedAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "deliveryPlannedAt must be after pickupPlannedAt",
      path: ["deliveryPlannedAt"],
    });
  }
}

function validateTimeline(value: {
  deliveryActualAt?: Date | null;
  deliveryPlannedAt?: Date | null;
  pickupActualAt?: Date | null;
  pickupPlannedAt?: Date | null;
}, ctx: z.RefinementCtx) {
  if (value.pickupPlannedAt && value.deliveryPlannedAt && value.deliveryPlannedAt < value.pickupPlannedAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "deliveryPlannedAt must be after pickupPlannedAt",
      path: ["deliveryPlannedAt"],
    });
  }

  if (value.pickupActualAt && value.deliveryActualAt && value.deliveryActualAt < value.pickupActualAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "deliveryActualAt must be after pickupActualAt",
      path: ["deliveryActualAt"],
    });
  }
}

export const listContractsSchema = z.object({
  params: z.object({}),
  query: z.object({
    status: z.nativeEnum(ContractStatus).optional(),
  }),
  body: z.object({}),
});

export const getContractByIdSchema = z.object({
  params: z.object({
    contractId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const createContractSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z
    .object({
      postId: cuidParam,
      acceptedBidId: cuidParam,
      pickupPlannedAt: z.coerce.date().optional(),
      deliveryPlannedAt: z.coerce.date().optional(),
    })
    .superRefine(validateWindow),
});

export const changeContractStatusSchema = z.object({
  params: z.object({
    contractId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({
    status: z.nativeEnum(ContractStatus),
  }),
});

export const updateContractTimelineSchema = z.object({
  params: z.object({
    contractId: cuidParam,
  }),
  query: z.object({}),
  body: z
    .object({
      deliveryActualAt: z.coerce.date().nullable().optional(),
      deliveryPlannedAt: z.coerce.date().nullable().optional(),
      pickupActualAt: z.coerce.date().nullable().optional(),
      pickupPlannedAt: z.coerce.date().nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one timeline field must be provided",
    })
    .superRefine(validateTimeline),
});

export const deleteContractSchema = z.object({
  params: z.object({
    contractId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const restoreContractSchema = z.object({
  params: z.object({
    contractId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

