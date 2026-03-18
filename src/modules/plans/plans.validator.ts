import { z } from "zod";

export const listPlansSchema = z.object({
  query: z.object({
    activeOnly: z.coerce.boolean().default(true),
  }),
  params: z.object({}),
  body: z.object({}),
});

