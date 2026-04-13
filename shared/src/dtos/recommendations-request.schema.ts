import { z } from "zod";
import {
  coerceStringArray,
} from "../lib/search-params.ts";
import { DateRangeSchema } from "./date-range.schema.ts";

export const RecommendationsRequestSchema = z.object({
  aspect_code: z.string(),
  author_name: z.string().max(255).optional(),
  background: z.string().optional(),
  date_range: DateRangeSchema,
  required_cards: z
    .preprocess(coerceStringArray, z.array(z.string()))
    .optional()
    .default([]),
  specialty: z.string().optional(),
});

export type RecommendationsRequest = z.infer<
  typeof RecommendationsRequestSchema
>;
