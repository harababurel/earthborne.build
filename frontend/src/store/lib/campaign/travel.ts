import type { Campaign, HistoryEntry } from "@earthborne-build/shared";
import { getMapLocationsForCampaign } from "./data";
import type { LocationConnection } from "./types";

// Locations reachable from the campaign's current location (deduped by neighbour).
export function adjacentLocations(campaign: Campaign): LocationConnection[] {
  if (!campaign.current_location) return [];
  const map = getMapLocationsForCampaign(campaign);
  const current = map[campaign.current_location];
  if (!current) return [];

  const seen = new Set<string>();
  const result: LocationConnection[] = [];
  for (const conn of current.connections) {
    if (seen.has(conn.id)) continue;
    seen.add(conn.id);
    result.push(conn);
  }
  return result;
}

export type TravelInput = {
  // Destination is optional: omitting it = camp/stay in place.
  to?: string | null;
  path_terrain?: string | null;
  camped?: boolean;
};

// Pure transition: append a journey-history entry and optionally move to a
// destination. Entries record the day the travel happened; camping then
// advances the campaign to the next day (mirrors the physical tracker and
// rangers-db). When staying in place the current terrain is kept unless the
// caller overrides it — next-day setup builds the path deck from the terrain
// you were traveling on.
export function applyTravel(
  campaign: Campaign,
  input: TravelInput,
): Partial<Campaign> {
  const location = input.to ?? campaign.current_location ?? null;
  const terrain = input.to
    ? (input.path_terrain ?? null)
    : (input.path_terrain ?? campaign.current_path_terrain ?? null);
  const entry: HistoryEntry = {
    day: campaign.day,
    location,
    path_terrain: terrain,
    camped: input.camped ?? false,
  };

  return {
    day: input.camped ? campaign.day + 1 : campaign.day,
    current_location: location,
    current_path_terrain: terrain,
    history: [...campaign.history, entry],
  };
}

// End the day in place: advance the day with no movement. Not recorded in the
// journey history (mirrors rangers-db); the terrain you were traveling on is
// kept — a forced day-end doesn't erase it and next-day setup still needs it.
export function applyEndDay(campaign: Campaign): Partial<Campaign> {
  return { day: campaign.day + 1 };
}

// The campaign day after a history entry resolved (camping ends the day).
function dayAfter(entry: HistoryEntry): number {
  return entry.day + (entry.camped ? 1 : 0);
}

export function canUndo(campaign: Campaign): boolean {
  return campaign.history.length > 0 || campaign.day > 1;
}

// Revert the most recent action. Days ended after the last travel are undone
// first (day counter only); then the last travel is popped, restoring
// day/location/terrain from the prior entry or the campaign start.
export function undoTravel(campaign: Campaign): Partial<Campaign> {
  const last = campaign.history[campaign.history.length - 1];

  // End-days sit "on top of" the last travel entry (or the campaign start).
  const dayAfterLastTravel = last ? dayAfter(last) : 1;
  if (campaign.day > dayAfterLastTravel) {
    return { day: campaign.day - 1 };
  }

  if (!last) return {};

  const history = campaign.history.slice(0, -1);
  const prev = history[history.length - 1];

  return {
    history,
    day: last.day,
    current_location: prev?.location ?? campaign.start_location ?? null,
    current_path_terrain: prev?.path_terrain ?? null,
  };
}
