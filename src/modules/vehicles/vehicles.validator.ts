import { VehicleBodyType, VehicleType } from "@prisma/client";
import { z } from "zod";

const cuidParam = z.string().cuid();

const decimalLike = z.union([z.string().trim(), z.number()]);

export const listVehiclesSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({}),
});

export const getVehicleByIdSchema = z.object({
  params: z.object({
    vehicleId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const createVehicleSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({
    vehicleType: z.nativeEnum(VehicleType),
    plateNumber: z.string().trim().min(2).max(40),
    countryOfRegistration: z.string().trim().length(2),
    brand: z.string().trim().min(1).max(80).optional(),
    model: z.string().trim().min(1).max(80).optional(),
    year: z.number().int().min(1950).max(2100).optional(),
    capacityKg: z.number().int().positive().optional(),
    volumeM3: decimalLike.optional(),
    bodyType: z.nativeEnum(VehicleBodyType).optional(),
    refrigerated: z.boolean().optional(),
    hazmatCertified: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateVehicleSchema = z.object({
  params: z.object({
    vehicleId: cuidParam,
  }),
  query: z.object({}),
  body: z
    .object({
      vehicleType: z.nativeEnum(VehicleType).optional(),
      plateNumber: z.string().trim().min(2).max(40).optional(),
      countryOfRegistration: z.string().trim().length(2).optional(),
      brand: z.string().trim().min(1).max(80).nullable().optional(),
      model: z.string().trim().min(1).max(80).nullable().optional(),
      year: z.number().int().min(1950).max(2100).nullable().optional(),
      capacityKg: z.number().int().positive().nullable().optional(),
      volumeM3: decimalLike.nullable().optional(),
      bodyType: z.nativeEnum(VehicleBodyType).nullable().optional(),
      refrigerated: z.boolean().optional(),
      hazmatCertified: z.boolean().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const deleteVehicleSchema = z.object({
  params: z.object({
    vehicleId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const restoreVehicleSchema = z.object({
  params: z.object({
    vehicleId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

