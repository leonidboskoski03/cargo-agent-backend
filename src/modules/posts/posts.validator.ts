import { PostPriceType, PostStatus, VehicleBodyType } from "@prisma/client";
import { z } from "zod";

const cuidParam = z.string().cuid();
const decimalLike = z.union([z.string().trim(), z.number()]);

function validatePostWindow(
  value: {
	pickupEarliestAt?: Date | null;
	pickupLatestAt?: Date | null;
	deliveryDeadlineAt?: Date | null;
	expiresAt?: Date | null;
	temperatureMinC?: number | null;
	temperatureMaxC?: number | null;
  },
  ctx: z.RefinementCtx,
) {
  if (value.pickupEarliestAt && value.pickupLatestAt && value.pickupLatestAt < value.pickupEarliestAt) {
	ctx.addIssue({
	  code: z.ZodIssueCode.custom,
	  message: "pickupLatestAt must be after pickupEarliestAt",
	  path: ["pickupLatestAt"],
	});
  }

  if (value.pickupLatestAt && value.deliveryDeadlineAt && value.deliveryDeadlineAt < value.pickupLatestAt) {
	ctx.addIssue({
	  code: z.ZodIssueCode.custom,
	  message: "deliveryDeadlineAt must be after pickupLatestAt",
	  path: ["deliveryDeadlineAt"],
	});
  }

  if (value.expiresAt && value.pickupEarliestAt && value.expiresAt > value.pickupEarliestAt) {
	ctx.addIssue({
	  code: z.ZodIssueCode.custom,
	  message: "expiresAt should not be after pickupEarliestAt",
	  path: ["expiresAt"],
	});
  }

  if (
	value.temperatureMinC !== undefined &&
	value.temperatureMinC !== null &&
	value.temperatureMaxC !== undefined &&
	value.temperatureMaxC !== null &&
	value.temperatureMaxC < value.temperatureMinC
  ) {
	ctx.addIssue({
	  code: z.ZodIssueCode.custom,
	  message: "temperatureMaxC must be >= temperatureMinC",
	  path: ["temperatureMaxC"],
	});
  }
}

const postBodyBase = z.object({
  routeId: cuidParam,
  title: z.string().trim().min(1).max(180).optional(),
  description: z.string().trim().max(4000).optional(),
  pickupEarliestAt: z.coerce.date().optional(),
  pickupLatestAt: z.coerce.date().optional(),
  deliveryDeadlineAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  cargoDescription: z.string().trim().max(2000).optional(),
  cargoType: z.string().trim().max(120).optional(),
  weightKg: z.number().int().positive().optional(),
  palletCount: z.number().int().positive().optional(),
  volumeM3: decimalLike.optional(),
  requiredBodyType: z.nativeEnum(VehicleBodyType).optional(),
  hazmat: z.boolean().optional(),
  temperatureControlRequired: z.boolean().optional(),
  temperatureMinC: z.number().int().optional(),
  temperatureMaxC: z.number().int().optional(),
  priceType: z.nativeEnum(PostPriceType),
  priceAmount: decimalLike.optional(),
  currency: z.string().trim().min(3).max(3),
  isPromoted: z.boolean().optional(),
  promotedUntil: z.coerce.date().optional(),
});

export const listPostsSchema = z.object({
  params: z.object({}),
  query: z.object({
	status: z.nativeEnum(PostStatus).optional(),
  }),
  body: z.object({}),
});

export const getPostByIdSchema = z.object({
  params: z.object({
	postId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const createPostSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: postBodyBase.superRefine(validatePostWindow),
});

export const updatePostSchema = z.object({
  params: z.object({
	postId: cuidParam,
  }),
  query: z.object({}),
  body: z
	.object({
	  routeId: cuidParam.optional(),
	  title: z.string().trim().min(1).max(180).nullable().optional(),
	  description: z.string().trim().max(4000).nullable().optional(),
	  pickupEarliestAt: z.coerce.date().nullable().optional(),
	  pickupLatestAt: z.coerce.date().nullable().optional(),
	  deliveryDeadlineAt: z.coerce.date().nullable().optional(),
	  expiresAt: z.coerce.date().nullable().optional(),
	  cargoDescription: z.string().trim().max(2000).nullable().optional(),
	  cargoType: z.string().trim().max(120).nullable().optional(),
	  weightKg: z.number().int().positive().nullable().optional(),
	  palletCount: z.number().int().positive().nullable().optional(),
	  volumeM3: decimalLike.nullable().optional(),
	  requiredBodyType: z.nativeEnum(VehicleBodyType).nullable().optional(),
	  hazmat: z.boolean().optional(),
	  temperatureControlRequired: z.boolean().optional(),
	  temperatureMinC: z.number().int().nullable().optional(),
	  temperatureMaxC: z.number().int().nullable().optional(),
	  priceType: z.nativeEnum(PostPriceType).optional(),
	  priceAmount: decimalLike.nullable().optional(),
	  currency: z.string().trim().min(3).max(3).optional(),
	  isPromoted: z.boolean().optional(),
	  promotedUntil: z.coerce.date().nullable().optional(),
	})
	.refine((body) => Object.keys(body).length > 0, {
	  message: "At least one field must be provided",
	})
	.superRefine((value, ctx) => {
	  validatePostWindow(
		{
		  pickupEarliestAt: value.pickupEarliestAt,
		  pickupLatestAt: value.pickupLatestAt,
		  deliveryDeadlineAt: value.deliveryDeadlineAt,
		  expiresAt: value.expiresAt,
		  temperatureMinC: value.temperatureMinC,
		  temperatureMaxC: value.temperatureMaxC,
		},
		ctx,
	  );
	}),
});

export const deletePostSchema = z.object({
  params: z.object({
	postId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const restorePostSchema = z.object({
  params: z.object({
	postId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const changePostStatusSchema = z.object({
  params: z.object({
	postId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({
	status: z.nativeEnum(PostStatus),
  }),
});

