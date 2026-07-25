import { z } from "zod";
import type { Campaign } from "../schemas/campaign.schema.ts";
import type { Deck } from "../schemas/deck.schema.ts";
import { SlotsSchema } from "../schemas/deck.schema.ts";

// This is a public API contract consumed by third-party tools, so every field is
// spelled out instead of derived from CampaignSchema/DeckSchema. Adding a field
// to those internal schemas must never publish it by accident, and they must
// stay free to change shape without breaking external consumers.

export const PUBLIC_CAMPAIGN_SCHEMA_VERSION = 1;

const PublicMissionSchema = z.object({
  day: z.number(),
  name: z.string(),
  card_code: z.string().nullish(),
  subject: z.string().nullish(),
  progress: z.number().nullish(),
  completed: z.boolean().nullish(),
  checks: z.array(z.boolean()).nullish(),
});

const PublicCalendarEntrySchema = z.object({
  day: z.number(),
  guides: z.array(z.string()),
});

const PublicEventSchema = z.object({
  event: z.string(),
  crossed_out: z.boolean().nullish(),
});

const PublicNoteSchema = z.object({
  note: z.string(),
  day: z.number(),
  crossed_out: z.boolean().nullish(),
});

const PublicHistoryEntrySchema = z.object({
  day: z.number(),
  location: z.string().nullish(),
  path_terrain: z.string().nullish(),
  camped: z.boolean().nullish(),
});

const PublicRemovedEntrySchema = z.object({
  set_id: z.string().nullish(),
  name: z.string(),
  action: z.enum(["removed", "moved"]).nullish(),
  destination: z.string().nullish(),
});

export const PublicDeckSchema = z.object({
  id: z.string(),
  name: z.string(),
  aspect_code: z.string(),
  role_code: z.string(),
  background: z.string(),
  specialty: z.string(),
  slots: SlotsSchema,
  rewards: SlotsSchema.nullable(),
  displaced: SlotsSchema.nullable(),
  maladies: SlotsSchema.nullable(),
  date_creation: z.string(),
  date_update: z.string(),
});
export type PublicDeck = z.infer<typeof PublicDeckSchema>;

export const PublicCampaignDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  cycle_id: z.string(),
  expansions: z.array(z.string()),
  extended_calendar: z.boolean(),
  day: z.number(),
  current_location: z.string().nullish(),
  current_path_terrain: z.string().nullish(),
  rewards: z.array(z.string()),
  missions: z.array(PublicMissionSchema),
  history: z.array(PublicHistoryEntrySchema),
  calendar: z.array(PublicCalendarEntrySchema),
  events: z.array(PublicEventSchema),
  notes: z.array(PublicNoteSchema),
  removed: z.array(PublicRemovedEntrySchema),
  date_creation: z.string(),
  date_update: z.string(),
});
export type PublicCampaignData = z.infer<typeof PublicCampaignDataSchema>;

export const PublicCampaignSchema = z.object({
  schema_version: z.literal(PUBLIC_CAMPAIGN_SCHEMA_VERSION),
  campaign: PublicCampaignDataSchema,
  decks: z.array(PublicDeckSchema),
});
export type PublicCampaign = z.infer<typeof PublicCampaignSchema>;

// Parsing on the way out is what makes the omissions above load-bearing: zod
// strips unknown keys, so a field added to an internal nested entry cannot leak
// through the pass-through arrays below.
export function toPublicCampaign(
  campaign: Campaign,
  decks: Deck[],
): PublicCampaign {
  return PublicCampaignSchema.parse({
    schema_version: PUBLIC_CAMPAIGN_SCHEMA_VERSION,
    campaign: {
      id: String(campaign.id),
      name: campaign.name,
      cycle_id: campaign.cycle_id,
      expansions: campaign.expansions,
      extended_calendar: campaign.extended_calendar,
      day: campaign.day,
      current_location: campaign.current_location,
      current_path_terrain: campaign.current_path_terrain,
      rewards: campaign.rewards,
      missions: campaign.missions,
      history: campaign.history,
      calendar: campaign.calendar,
      events: campaign.events,
      notes: campaign.notes,
      removed: campaign.removed,
      date_creation: campaign.date_creation,
      date_update: campaign.date_update,
    },
    decks: decks.map(toPublicDeck),
  });
}

export function toPublicDeck(deck: Deck): PublicDeck {
  return PublicDeckSchema.parse({
    id: String(deck.id),
    name: deck.name,
    aspect_code: deck.aspect_code,
    role_code: deck.role_code,
    background: deck.background,
    specialty: deck.specialty,
    slots: deck.slots,
    rewards: deck.rewards,
    displaced: deck.displaced,
    maladies: deck.maladies,
    date_creation: deck.date_creation,
    date_update: deck.date_update,
  });
}
