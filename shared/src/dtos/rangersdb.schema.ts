import { z } from "zod";

/**
 * A deck as returned by the RangersDB GraphQL API (rangers_deck).
 * Card codes are shared with our database — both projects source their
 * card data from `rangers-card-data`.
 */
export const RangersDbDeckSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.string().nullish(),
  like_count: z.number().nullish(),
  comment_count: z.number().nullish(),
  user: z.object({ handle: z.string().nullish() }).nullish(),
  awa: z.number().nullish(),
  spi: z.number().nullish(),
  fit: z.number().nullish(),
  foc: z.number().nullish(),
  meta: z
    .object({
      role: z.string().nullish(),
      background: z.string().nullish(),
      specialty: z.string().nullish(),
    })
    .catchall(z.unknown())
    .nullish(),
  slots: z.record(z.string(), z.number()).nullish(),
  // Card names as RangersDB knows them, keyed by code. Used to detect codes
  // that resolve to a different card in our database — the two projects track
  // different forks of `rangers-card-data`, so codes may drift apart.
  cards: z.record(z.string(), z.string()).nullish(),
});

export type RangersDbDeck = z.infer<typeof RangersDbDeckSchema>;
