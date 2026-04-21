import { z } from "zod";
import { coerceStringArray } from "../lib/search-params.ts";
import { DateRangeSchema } from "./date-range.schema.ts";

export const DecklistSearchRequestSchema = z.object({
  aspect_code: z.string().optional(),
  author_name: z.string().max(255).optional(),
  background: z.string().optional(),
  date_range: DateRangeSchema.nullish(),
  excluded: z.preprocess(coerceStringArray, z.array(z.string())).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  name: z.string().max(255).optional(),
  offset: z.coerce.number().int().min(0).optional().default(0),
  required: z.preprocess(coerceStringArray, z.array(z.string())).optional(),
  sort_by: z.enum(["date", "likes", "popularity"]).default("popularity"),
  sort_dir: z.enum(["asc", "desc"]).optional().default("desc"),
  specialty: z.string().optional(),
});

export type DecklistSearchRequest = z.infer<typeof DecklistSearchRequestSchema>;
