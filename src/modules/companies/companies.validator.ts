import { CompanyType } from "@prisma/client";
import { z } from "zod";

const cuidParam = z.string().cuid();

export const listCompaniesSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({}),
});

export const getMyCompanySchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({}),
});

export const getCompanyByIdSchema = z.object({
  params: z.object({
    companyId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const updateMyCompanySchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z
    .object({
      companyType: z.nativeEnum(CompanyType).optional(),
      name: z.string().trim().min(2).max(160).optional(),
      countryCode: z.string().trim().length(2).optional(),
      city: z.string().trim().min(1).max(120).optional(),
      address: z.string().trim().min(1).max(250).nullable().optional(),
      phone: z.string().trim().min(5).max(40).nullable().optional(),
      email: z.string().trim().email().nullable().optional(),
      website: z.string().trim().url().nullable().optional(),
      logoUrl: z.string().trim().url().nullable().optional(),
      bannerUrl: z.string().trim().url().nullable().optional(),
      bio: z.string().trim().max(2000).nullable().optional(),
      foundedAt: z.coerce.date().nullable().optional(),
      employeeCount: z.number().int().min(0).nullable().optional(),
      isVerified: z.boolean().optional(),
      registrationNumber: z.string().trim().min(3).max(80).optional(),
      vatNumber: z.string().trim().min(2).max(80).nullable().optional(),
      stripeCustomerId: z.string().trim().min(3).max(120).nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const deleteMyCompanySchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({}),
});

export const restoreCompanySchema = z.object({
  params: z.object({
    companyId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

