import { z } from "zod";

export const PackSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  real_name: z.string(),
  short_name: z.string().nullable(),
  position: z.number().nullable(),
});

export type Pack = z.infer<typeof PackSchema>;
