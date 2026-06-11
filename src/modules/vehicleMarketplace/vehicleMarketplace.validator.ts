import {
  VehicleBodyType,
  VehicleMarketplaceInquiryStatus,
  VehicleMarketplaceIntent,
  VehicleMarketplaceListingStatus,
  VehicleMarketplaceSourceType,
  VehicleType,
} from "@prisma/client";
import { z } from "zod";

const cuidParam = z.string().cuid();
const decimalLike = z.union([z.string().trim(), z.number()]);
const optionalText = z.string().trim().min(1).max(120).optional();
const optionalLongText = z.string().trim().min(1).max(2000).optional();
const nullableText = z.string().trim().min(1).max(120).nullable().optional();
const nullableLongText = z.string().trim().min(1).max(2000).nullable().optional();
const optionalBooleanQuery = z.preprocess((value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean().optional());
const optionalIntQuery = z.coerce.number().int().optional();
const optionalDecimalQuery = z.coerce.number().optional();

export const listListingsSchema = z.object({
  params: z.object({}),
  query: z
    .object({
      q: z.string().trim().min(1).max(120).optional(),
      intent: z.nativeEnum(VehicleMarketplaceIntent).optional(),
      status: z.nativeEnum(VehicleMarketplaceListingStatus).optional(),
      sourceType: z.nativeEnum(VehicleMarketplaceSourceType).optional(),
      vehicleType: z.nativeEnum(VehicleType).optional(),
      bodyType: z.nativeEnum(VehicleBodyType).optional(),
      countryCode: z.string().trim().length(2).optional(),
      city: z.string().trim().min(1).max(120).optional(),
      brand: z.string().trim().min(1).max(80).optional(),
      model: z.string().trim().min(1).max(80).optional(),
      currency: z.string().trim().length(3).optional(),
      yearMin: optionalIntQuery,
      yearMax: optionalIntQuery,
      priceMin: optionalDecimalQuery,
      priceMax: optionalDecimalQuery,
      capacityMin: optionalIntQuery,
      capacityMax: optionalIntQuery,
      refrigerated: optionalBooleanQuery,
      hazmatCertified: optionalBooleanQuery,
      includeDeleted: optionalBooleanQuery,
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
    })
    .refine((query) => !query.yearMin || !query.yearMax || query.yearMax >= query.yearMin, {
      message: "yearMax must be greater than or equal to yearMin",
      path: ["yearMax"],
    })
    .refine((query) => !query.priceMin || !query.priceMax || query.priceMax >= query.priceMin, {
      message: "priceMax must be greater than or equal to priceMin",
      path: ["priceMax"],
    })
    .refine((query) => !query.capacityMin || !query.capacityMax || query.capacityMax >= query.capacityMin, {
      message: "capacityMax must be greater than or equal to capacityMin",
      path: ["capacityMax"],
    }),
  body: z.object({}),
});

export const getListingSchema = z.object({
  params: z.object({ listingId: cuidParam }),
  query: z.object({}),
  body: z.object({}),
});

export const createListingSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z
    .object({
      title: z.string().trim().min(3).max(160),
      description: optionalLongText,
      intent: z.nativeEnum(VehicleMarketplaceIntent),
      sourceType: z.nativeEnum(VehicleMarketplaceSourceType),
      status: z.nativeEnum(VehicleMarketplaceListingStatus).optional(),
      vehicleId: cuidParam.optional(),
      vehicleType: z.nativeEnum(VehicleType),
      bodyType: z.nativeEnum(VehicleBodyType).optional(),
      brand: optionalText,
      model: optionalText,
      year: z.number().int().min(1950).max(2100).optional(),
      countryCode: z.string().trim().length(2),
      city: z.string().trim().min(1).max(120),
      priceAmount: decimalLike.optional(),
      currency: z.string().trim().length(3).optional(),
      capacityKg: z.number().int().positive().optional(),
      volumeM3: decimalLike.optional(),
      refrigerated: z.boolean().optional(),
      hazmatCertified: z.boolean().optional(),
      imageUrlsJson: z.unknown().optional(),
      documentsJson: z.unknown().optional(),
    })
    .refine((body) => body.sourceType !== VehicleMarketplaceSourceType.FLEET_VEHICLE || Boolean(body.vehicleId), {
      message: "vehicleId is required for fleet-backed listings",
      path: ["vehicleId"],
    })
    .refine((body) => body.sourceType !== VehicleMarketplaceSourceType.STANDALONE || !body.vehicleId, {
      message: "vehicleId is only allowed for fleet-backed listings",
      path: ["vehicleId"],
    }),
});

export const updateListingSchema = z.object({
  params: z.object({ listingId: cuidParam }),
  query: z.object({}),
  body: z
    .object({
      title: z.string().trim().min(3).max(160).optional(),
      description: nullableLongText,
      intent: z.nativeEnum(VehicleMarketplaceIntent).optional(),
      status: z.nativeEnum(VehicleMarketplaceListingStatus).optional(),
      vehicleType: z.nativeEnum(VehicleType).optional(),
      bodyType: z.nativeEnum(VehicleBodyType).nullable().optional(),
      brand: nullableText,
      model: nullableText,
      year: z.number().int().min(1950).max(2100).nullable().optional(),
      countryCode: z.string().trim().length(2).optional(),
      city: z.string().trim().min(1).max(120).optional(),
      priceAmount: decimalLike.nullable().optional(),
      currency: z.string().trim().length(3).nullable().optional(),
      capacityKg: z.number().int().positive().nullable().optional(),
      volumeM3: decimalLike.nullable().optional(),
      refrigerated: z.boolean().optional(),
      hazmatCertified: z.boolean().optional(),
      imageUrlsJson: z.unknown().nullable().optional(),
      documentsJson: z.unknown().nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const deleteListingSchema = getListingSchema;
export const restoreListingSchema = getListingSchema;

export const createListingInquirySchema = z.object({
  params: z.object({ listingId: cuidParam }),
  query: z.object({}),
  body: z.object({
    message: z.string().trim().min(3).max(2000),
    contactName: optionalText,
    contactEmail: z.string().trim().email().optional(),
    contactPhone: z.string().trim().min(3).max(40).optional(),
  }),
});

export const listInquiriesSchema = z.object({
  params: z.object({}),
  query: z.object({
    status: z.nativeEnum(VehicleMarketplaceInquiryStatus).optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
  }),
  body: z.object({}),
});

export const updateInquirySchema = z.object({
  params: z.object({ inquiryId: cuidParam }),
  query: z.object({}),
  body: z.object({
    status: z.nativeEnum(VehicleMarketplaceInquiryStatus),
  }),
});
