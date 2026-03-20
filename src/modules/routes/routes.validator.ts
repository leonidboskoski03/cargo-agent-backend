import { z } from "zod";

const cuidParam = z.string().cuid();

export const listRoutesSchema = z.object({
  params: z.object({}),
  query: z.object({
    originLocationId: z.string().cuid().optional(),
    destinationLocationId: z.string().cuid().optional(),
  }),
  body: z.object({}),
});

export const getRouteByIdSchema = z.object({
  params: z.object({
    routeId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const createRouteSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z
    .object({
      originLocationId: cuidParam,
      destinationLocationId: cuidParam,
      distanceKm: z.number().int().positive().optional(),
      estimatedDurationMinutes: z.number().int().positive().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((body) => body.originLocationId !== body.destinationLocationId, {
      message: "originLocationId and destinationLocationId must be different",
      path: ["destinationLocationId"],
    }),
});

export const updateRouteSchema = z.object({
  params: z.object({
    routeId: cuidParam,
  }),
  query: z.object({}),
  body: z
    .object({
      originLocationId: cuidParam.optional(),
      destinationLocationId: cuidParam.optional(),
      distanceKm: z.number().int().positive().nullable().optional(),
      estimatedDurationMinutes: z.number().int().positive().nullable().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const deleteRouteSchema = z.object({
  params: z.object({
    routeId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const restoreRouteSchema = z.object({
  params: z.object({
    routeId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

