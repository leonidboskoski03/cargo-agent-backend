import { z } from "zod";

const cuidParam = z.string().cuid();
const decimalLike = z.union([z.string().trim(), z.number()]);

export const listLocationsSchema = z.object({
  params: z.object({}),
  query: z.object({
    countryCode: z.string().trim().length(2).optional(),
    city: z.string().trim().min(1).max(120).optional(),
  }),
  body: z.object({}),
});

export const getLocationByIdSchema = z.object({
  params: z.object({
    locationId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const createLocationSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({
    countryCode: z.string().trim().length(2),
    city: z.string().trim().min(1).max(120),
    region: z.string().trim().min(1).max(120).optional(),
    postalCode: z.string().trim().min(1).max(40).optional(),
    lat: decimalLike.optional(),
    lng: decimalLike.optional(),
  }),
});

export const updateLocationSchema = z.object({
  params: z.object({
    locationId: cuidParam,
  }),
  query: z.object({}),
  body: z
    .object({
      countryCode: z.string().trim().length(2).optional(),
      city: z.string().trim().min(1).max(120).optional(),
      region: z.string().trim().min(1).max(120).nullable().optional(),
      postalCode: z.string().trim().min(1).max(40).nullable().optional(),
      lat: decimalLike.nullable().optional(),
      lng: decimalLike.nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const deleteLocationSchema = z.object({
  params: z.object({
    locationId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const restoreLocationSchema = z.object({
  params: z.object({
    locationId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

