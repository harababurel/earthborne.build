import { z } from "zod";
import { idSchema } from "./deck.schema.ts";

// "core" → Lure of the Valley, "loa" → Legacy of the Ancestors.
// Spire in Bloom ("sib") and Shadow of the Storm ("sos") are not cycles — they
// are expansion toggles folded into a "core" campaign (see `expansions`).
export const CampaignCycleSchema = z.enum(["core", "loa"]);
export type CampaignCycle = z.infer<typeof CampaignCycleSchema>;

export const MissionEntrySchema = z.object({
  day: z.number(),
  name: z.string(),
  // Card code of the chosen mission card (for thumbnail + canonical identity).
  card_code: z.string().nullish(),
  // Free-text instance of the mission, e.g. "Quisi Vos" for "Helping Hand".
  subject: z.string().nullish(),
  progress: z.number().nullish(),
  completed: z.boolean().nullish(),
  checks: z.array(z.boolean()).nullish(),
});
export type MissionEntry = z.infer<typeof MissionEntrySchema>;

export const CalendarEntrySchema = z.object({
  day: z.number(),
  guides: z.array(z.string()),
});
export type CalendarEntry = z.infer<typeof CalendarEntrySchema>;

export const NotableEventSchema = z.object({
  event: z.string(),
  crossed_out: z.boolean().nullish(),
});
export type NotableEvent = z.infer<typeof NotableEventSchema>;

export const CampaignNoteSchema = z.object({
  note: z.string(),
  day: z.number(),
  crossed_out: z.boolean().nullish(),
});
export type CampaignNote = z.infer<typeof CampaignNoteSchema>;

export const HistoryEntrySchema = z.object({
  day: z.number(),
  location: z.string().nullish(),
  path_terrain: z.string().nullish(),
  camped: z.boolean().nullish(),
});
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

export const RemovedEntrySchema = z.object({
  set_id: z.string().nullish(),
  name: z.string(),
  // "removed" = taken out of the game; "moved" = relocated to `destination`
  // (a set's display name). Absent is treated as "removed" for older entries.
  action: z.enum(["removed", "moved"]).nullish(),
  destination: z.string().nullish(),
});
export type RemovedEntry = z.infer<typeof RemovedEntrySchema>;

export const CampaignSchema = z.object({
  id: idSchema,
  name: z.string(),
  date_creation: z.string(),
  date_update: z.string(),

  cycle_id: CampaignCycleSchema,
  expansions: z.array(z.string()).default([]),
  extended_calendar: z.boolean().default(false),

  day: z.number().default(1),
  // Where the campaign began; undoing the first travel restores this.
  start_location: z.string().nullish(),
  current_location: z.string().nullish(),
  current_path_terrain: z.string().nullish(),

  history: z.array(HistoryEntrySchema).default([]),
  missions: z.array(MissionEntrySchema).default([]),
  calendar: z.array(CalendarEntrySchema).default([]),
  events: z.array(NotableEventSchema).default([]),
  notes: z.array(CampaignNoteSchema).default([]),
  // Campaign-wide pool of unlocked reward card codes — the shared state that
  // linked decks read from when offering rewards to unlock.
  rewards: z.array(z.string()).default([]),
  removed: z.array(RemovedEntrySchema).default([]),

  // Linked local decks (the party). Source of truth for the deck↔campaign link;
  // the reverse lookup is a derived selector, so DeckSchema is left untouched.
  deck_ids: z.array(idSchema).default([]),

  // Campaign chaining (e.g. a "core" campaign transferred into "loa").
  previous_campaign_id: idSchema.nullish(),
  next_campaign_id: idSchema.nullish(),
});

export type Campaign = z.infer<typeof CampaignSchema>;

export function isCampaign(x: unknown): x is Campaign {
  return CampaignSchema.safeParse(x).success;
}
