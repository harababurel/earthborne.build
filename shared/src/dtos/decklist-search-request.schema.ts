import { z } from "zod";
import { coerceStringArray } from "../lib/search-params.ts";

export const DecklistSearchRequestSchema = z.object({
  name: z.string().max(255).optional(),
  role_code: z.string().optional(),
  background: z.string().optional(),
  specialty: z.string().optional(),
  tags: z.string().optional(),
  required: z.preprocess(coerceStringArray, z.array(z.string())).optional(),
  excluded: z.preprocess(coerceStringArray, z.array(z.string())).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type DecklistSearchRequest = z.infer<typeof DecklistSearchRequestSchema>;
