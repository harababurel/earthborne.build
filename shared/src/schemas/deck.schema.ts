import { z } from "zod";

const idSchema = z.union([z.number(), z.string()]);
export type Id = z.infer<typeof idSchema>;

export const SlotsSchema = z.record(z.string(), z.number());
export type Slots = z.infer<typeof SlotsSchema>;

const DeckProblemSchema = z.enum([
  "too_few_cards",
  "too_many_cards",
  "too_many_copies",
  "invalid_cards",
]);
export type DeckProblem = z.infer<typeof DeckProblemSchema>;

export const DeckSchema = z.object({
  date_creation: z.string(),
  date_update: z.string(),
  description_md: z.string(),
  meta: z.string(),
  id: idSchema,
  name: z.string(),
  problem: z.union([DeckProblemSchema, z.string()]).nullish(),
  slots: SlotsSchema,
  rewards: SlotsSchema.nullable().default(null),
  displaced: SlotsSchema.nullable().default(null),
  maladies: SlotsSchema.nullable().default(null),
  source: z.string().nullish(),
  tags: z.string(),
  user_id: z.number().nullish(),

  // ER-specific fields — set during deck creation and persisted with the deck.
  aspect_code: z.string(),
  role_code: z.string(),
  background: z.string(),
  specialty: z.string(),
});

export type Deck = z.infer<typeof DeckSchema>;

export function isDeck(x: unknown): x is Deck {
  const res = DeckSchema.safeParse(x);
  return res.success;
}
