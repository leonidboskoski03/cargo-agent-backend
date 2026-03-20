import { ReviewStatus } from "@prisma/client";
import { z } from "zod";

const cuidParam = z.string().cuid();

export const listReviewsSchema = z.object({
  params: z.object({}),
  query: z.object({
    status: z.nativeEnum(ReviewStatus).optional(),
    contractId: z.string().cuid().optional(),
  }),
  body: z.object({}),
});

export const getReviewByIdSchema = z.object({
  params: z.object({ reviewId: cuidParam }),
  query: z.object({}),
  body: z.object({}),
});

export const createReviewSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({
    contractId: cuidParam,
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).optional(),
    status: z.nativeEnum(ReviewStatus).optional(),
  }),
});

export const updateReviewSchema = z.object({
  params: z.object({ reviewId: cuidParam }),
  query: z.object({}),
  body: z
    .object({
      rating: z.number().int().min(1).max(5).optional(),
      comment: z.string().trim().max(2000).nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const changeReviewStatusSchema = z.object({
  params: z.object({ reviewId: cuidParam }),
  query: z.object({}),
  body: z.object({ status: z.nativeEnum(ReviewStatus) }),
});

export const deleteReviewSchema = z.object({
  params: z.object({ reviewId: cuidParam }),
  query: z.object({}),
  body: z.object({}),
});

export const restoreReviewSchema = z.object({
  params: z.object({ reviewId: cuidParam }),
  query: z.object({}),
  body: z.object({}),
});

