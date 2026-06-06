import { z } from "zod";

export const listCountriesSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({}),
});

export const listCitiesSchema = z.object({
  params: z.object({}),
  query: z.object({
    countryCode: z.string().trim().length(2).optional(),
    q: z.string().trim().min(1).max(120).optional(),
    pageSize: z.coerce.number().int().positive().max(50).optional(),
  }),
  body: z.object({}),
});
