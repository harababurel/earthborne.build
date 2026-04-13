import { z } from "zod";

/**
 * Earthborne Rangers decklist schema.
 *
 * A decklist represents a saved ranger deck configuration:
 * - 30 cards (15 unique x 2 copies)
 * - 1 aspect card (outside deck)
 * - 1 role card (outside deck, starts in play)
 * - Optional reward/malady modifications from campaign play
 */
export const DecklistSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  date_creation: z.string(),
  date_update: z.string().nullable(),
  description_md: z.string().nullable(),

  // The ranger's aspect card code
  aspect_code: z.string(),

  // The ranger's role card code
  role_code: z.string(),

  // Background and specialty choices
  background: z.string(),
  specialty: z.string(),

  // Card slots: card_code -> quantity (always 2 for standard cards)
  slots: z.record(z.string(), z.number()),

  // Rewards currently swapped into the deck
  rewards: z.record(z.string(), z.number()).nullable(),

  // Maladies added during campaign
  maladies: z.record(z.string(), z.number()).nullable(),

  // Cards displaced by rewards (can be swapped back in)
  displaced: z.record(z.string(), z.number()).nullable(),

  // User/sharing metadata
  user_id: z.union([z.string(), z.number()]).nullable(),
  tags: z.string().nullable(),
  version: z.string().nullable(),

  // Source tracking
  source: z.string().default("local"),
});

export type Decklist = z.infer<typeof DecklistSchema>;
