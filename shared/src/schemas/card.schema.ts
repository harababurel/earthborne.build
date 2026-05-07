import { z } from "zod";
import {
  ASPECT_ORDER,
  BACKGROUND_TYPES,
  CARD_CATEGORY_IDS,
  CARD_TYPE_ORDER,
  RANGER_CARD_CATEGORY,
  SPECIALTY_TYPES,
} from "../lib/constants.ts";

/**
 * Earthborne Rangers card data schema.
 *
 * This represents a single card in the game — both ranger deck cards
 * (moments, gear, attachments, etc.) and game cards (path cards, locations,
 * weather, missions, challenges, aspect cards, roles).
 */
export const CardSchema = z.object({
  // Identity
  code: z.string(),
  name: z.string(),
  pack_code: z.string(),
  set_code: z.string().nullish(),
  set_position: z.union([z.number(), z.string()]).nullish(),
  set_size: z.number().nullish(),
  type_code: z.enum(CARD_TYPE_ORDER),
  category: z.enum(RANGER_CARD_CATEGORY).nullish(),
  category_id: z.enum(CARD_CATEGORY_IDS).nullish(),

  // Card text
  text: z.string().nullish(),
  flavor: z.string().nullish(),
  traits: z.string().nullish(),
  keywords: z.array(z.string()).nullish(),

  // Costs and requirements
  energy_cost: z.number().nullish(),
  energy_aspect: z.enum(ASPECT_ORDER).nullish(),
  aspect_requirement_type: z.enum(ASPECT_ORDER).nullish(),
  aspect_requirement_value: z.number().nullish(),

  // Equip (gear cards)
  equip_value: z.number().nullish(),

  // Approach icons (left side of ranger cards)
  approach_conflict: z.number().nullish(),
  approach_reason: z.number().nullish(),
  approach_exploration: z.number().nullish(),
  approach_connection: z.number().nullish(),

  // Thresholds (path cards, beings, features, locations)
  presence: z.number().nullish(),
  harm_threshold: z.union([z.number(), z.string()]).nullish(),
  progress_threshold: z.union([z.number(), z.string()]).nullish(),

  // Tokens (named tokens placed on the card)
  token_name: z.string().nullish(),
  token_plural: z.string().nullish(),
  token_count: z.union([z.number(), z.string()]).nullish(),

  // Area indicator (path cards)
  area: z.enum(["within_reach", "along_the_way"]).nullish(),

  // Aspect values (on aspect cards only — the 4 stat values)
  aspect_awareness: z.number().nullish(),
  aspect_fitness: z.number().nullish(),
  aspect_focus: z.number().nullish(),
  aspect_spirit: z.number().nullish(),

  // Background/specialty membership
  background_type: z.enum(BACKGROUND_TYPES).nullish(),
  specialty_type: z.enum(SPECIALTY_TYPES).nullish(),

  // Campaign guide reference
  campaign_guide_entry: z.number().nullish(),
  back_card_code: z.string().nullish(),

  // Challenge effects (text for each of the three challenge icons)
  challenge_crest: z.string().nullish(),
  challenge_mountain: z.string().nullish(),
  challenge_sun: z.string().nullish(),

  // Location card back text
  path_deck_assembly: z.string().nullish(),
  arrival_setup: z.string().nullish(),

  // Meta
  quantity: z.number().nullish(),
  deck_limit: z.number().nullish(),
  is_unique: z.boolean().nullish(),
  is_expert: z.boolean().nullish(),
  illustrator: z.string().nullish(),
  image_url: z.string().nullish(),
  back_image_url: z.string().nullish(),
  double_sided: z.boolean().nullish(),
});

export type Card = z.infer<typeof CardSchema>;

/**
 * Aspect card — the card that defines a ranger's four aspect values.
 * This is a subset/view; the data is stored in the same Card shape.
 */
export type AspectCard = Card & {
  type_code: "aspect";
  aspect_awareness: number;
  aspect_fitness: number;
  aspect_focus: number;
  aspect_spirit: number;
};

/**
 * Role card — starts in play, not part of the 30-card deck.
 */
export type RoleCard = Card & {
  type_code: "role";
  specialty_type: (typeof SPECIALTY_TYPES)[number];
};
