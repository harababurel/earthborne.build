import { z } from "zod";
import { coerceStringArray } from "../lib/search-params.ts";

const cardCodeSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);

export const DecklistSearchRequestSchema = z.object({
  name: z.string().max(255).optional(),
  role_code: z.string().optional(),
  background: z.string().optional(),
  specialty: z.string().optional(),
  tags: z.string().optional(),
  required: z
    .preprocess(coerceStringArray, z.array(cardCodeSchema).max(20))
    .optional(),
  excluded: z
    .preprocess(coerceStringArray, z.array(cardCodeSchema).max(20))
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type DecklistSearchRequest = z.infer<typeof DecklistSearchRequestSchema>;
