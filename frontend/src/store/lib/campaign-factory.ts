import type { Campaign, CampaignCycle, Id } from "@earthborne-build/shared";
import { randomId } from "@/utils/crypto";

type Payload = {
  name: string;
  cycle_id: CampaignCycle;
} & Partial<Omit<Campaign, "id" | "date_creation" | "date_update">>;

export function createCampaign(values: Payload): Campaign {
  const timestamp = new Date().toISOString();

  return {
    id: randomId(),
    date_creation: timestamp,
    date_update: timestamp,
    expansions: [],
    extended_calendar: false,
    day: 1,
    start_location: values.current_location ?? null,
    current_location: null,
    current_path_terrain: null,
    history: [],
    missions: [],
    calendar: [],
    events: [],
    notes: [],
    rewards: [],
    removed: [],
    deck_ids: [],
    previous_campaign_id: null,
    next_campaign_id: null,
    ...values,
  };
}

export function cloneCampaign(campaign: Campaign): Campaign {
  const now = new Date().toISOString();

  return {
    ...structuredClone(campaign),
    id: randomId(),
    name: `(Copy) ${campaign.name}`,
    date_creation: now,
    date_update: now,
    // A clone is a fresh, unlinked campaign — drop chaining and the party
    // (a deck belongs to at most one campaign).
    previous_campaign_id: null,
    next_campaign_id: null,
    deck_ids: [],
  };
}

export function isDeckLinked(campaign: Campaign, deckId: Id): boolean {
  return campaign.deck_ids.includes(deckId);
}
