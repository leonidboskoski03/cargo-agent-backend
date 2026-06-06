import { z } from "zod";

export const listLanguagesSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({}),
});
