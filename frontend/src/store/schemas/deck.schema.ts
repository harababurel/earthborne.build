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

const _SafeSlotsSchema = z.preprocess(
  (val) => (Array.isArray(val) ? {} : val),
  SlotsSchema.nullish(),
);

export const DeckSchema = z.object({
  date_creation: z.string(),
  date_update: z.string(),
  description_md: z.string(),
  meta: z.string(),
  id: idSchema,
  name: z.string(),
  problem: z.union([DeckProblemSchema, z.string()]).nullish(),
  slots: SlotsSchema,
  source: z.string().nullish(),
  tags: z.string(),
  user_id: z.number().nullish(),
  version: z.string(),

  // ER-specific fields — set during deck creation and persisted with the deck.
  aspect_code: z.string(),
  role_code: z.string(),
  background: z.string(),
  specialty: z.string(),
});

export type Deck = z.infer<typeof DeckSchema>;

export function isDeck(x: unknown): x is Deck {
  const res = DeckSchema.safeParse(x);
  if (!res.success) {
    console.error(res.error);
  }
  return res.success;
}
