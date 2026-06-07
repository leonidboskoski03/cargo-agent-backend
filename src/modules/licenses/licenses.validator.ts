import { z } from "zod";
import { isSupportedLicenseType } from "./licenseTypes.service.js";

const cuidParam = z.string().cuid();

const dateField = z.coerce.date();
const licenseTypeField = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .transform((value) => value.toUpperCase())
  .refine(isSupportedLicenseType, {
    message: "licenseType must be one of the supported license type codes",
  });

function validateIssuedAndExpiry<T extends { issuedAt?: Date; expiresAt?: Date }>(
  value: T,
  ctx: z.RefinementCtx,
) {
  if (value.issuedAt && value.expiresAt && value.expiresAt <= value.issuedAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "expiresAt must be after issuedAt",
      path: ["expiresAt"],
    });
  }
}

export const listLicensesSchema = z.object({
  params: z.object({}),
  query: z.object({
    userId: z.string().cuid().optional(),
  }),
  body: z.object({}),
});

export const listLicenseTypesSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({}),
});

export const getLicenseByIdSchema = z.object({
  params: z.object({
    licenseId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const createLicenseSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z
    .object({
      userId: z.string().cuid().optional(),
      licenseType: licenseTypeField,
      imageUrl: z.string().trim().url().optional(),
      documentUrl: z.string().trim().url().optional(),
      issuedAt: dateField.optional(),
      expiresAt: dateField.optional(),
      isValid: z.boolean().optional(),
    })
    .superRefine(validateIssuedAndExpiry),
});

export const updateLicenseSchema = z.object({
  params: z.object({
    licenseId: cuidParam,
  }),
  query: z.object({}),
  body: z
    .object({
      licenseType: licenseTypeField.optional(),
      imageUrl: z.string().trim().url().nullable().optional(),
      documentUrl: z.string().trim().url().nullable().optional(),
      issuedAt: dateField.nullable().optional(),
      expiresAt: dateField.nullable().optional(),
      isValid: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    })
    .superRefine((value, ctx) => {
      validateIssuedAndExpiry(
        {
          issuedAt: value.issuedAt ?? undefined,
          expiresAt: value.expiresAt ?? undefined,
        },
        ctx,
      );
    }),
});

export const deleteLicenseSchema = z.object({
  params: z.object({
    licenseId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

export const restoreLicenseSchema = z.object({
  params: z.object({
    licenseId: cuidParam,
  }),
  query: z.object({}),
  body: z.object({}),
});

