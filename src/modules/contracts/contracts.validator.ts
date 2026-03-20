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

