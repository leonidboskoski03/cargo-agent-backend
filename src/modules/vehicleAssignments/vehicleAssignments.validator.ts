import { z } from "zod";

const cuidParam = z.string().cuid();

function validateWindow<T extends { startsAt?: Date; endsAt?: Date | null }>(value: T, ctx: z.RefinementCtx) {
  if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "endsAt must be after startsAt",
      path: ["endsAt"],
    });
  }
}

export const listVehicleAssignmentsSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({}),
});

export const getVehicleAssignmentByIdSchema = z.object({
  params: z.object({
    assignmentId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const createVehicleAssignmentSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z
    .object({
      vehicleId: cuidParam,
      driverUserId: cuidParam,
      startsAt: z.coerce.date(),
      endsAt: z.coerce.date().optional(),
    })
    .superRefine(validateWindow),
});

export const updateVehicleAssignmentSchema = z.object({
  params: z.object({
    assignmentId: cuidParam,
  }),
  query: z.object({}),
  body: z
    .object({
      vehicleId: cuidParam.optional(),
      driverUserId: cuidParam.optional(),
      startsAt: z.coerce.date().optional(),
      endsAt: z.coerce.date().nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    })
    .superRefine((value, ctx) => {
      validateWindow(
        {
          startsAt: value.startsAt,
          endsAt: value.endsAt ?? undefined,
        },
        ctx,
      );
    }),
});

export const deleteVehicleAssignmentSchema = z.object({
  params: z.object({
    assignmentId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const restoreVehicleAssignmentSchema = z.object({
  params: z.object({
    assignmentId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

