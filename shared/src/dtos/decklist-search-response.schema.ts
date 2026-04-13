import { z } from "zod";
import { DecklistSchema } from "../schemas/decklist.schema.ts";

const DecklistSearchResultSchema = DecklistSchema.extend({
  user_name: z.string(),
  like_count: z.coerce.number().int().min(0).default(0),
});

export const DecklistSearchResponseSchema = z.object({
  meta: z.object({
    limit: z.number().int().min(1).max(100),
    offset: z.number().int().min(0),
    total: z.coerce.number().int().min(0),
  }),
  data: z.array(DecklistSearchResultSchema),
});

export type DecklistSearchResult = z.infer<typeof DecklistSearchResultSchema>;

export type DecklistSearchResponse = z.infer<
  typeof DecklistSearchResponseSchema
>;
