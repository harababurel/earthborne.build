import type { Campaign, HistoryEntry } from "@earthborne-build/shared";
import { getMapLocationsForCampaign, getWeather } from "./data";
import type { LocationConnection, WeatherEntry } from "./types";

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

// Pure transition: advance one day, append a journey-history entry, optionally
// move to a destination. Terrain is whatever the caller passes (defaulted from
// the chosen edge in the UI but freely overridable). Returns the `updateCampaign`
// patch.
export function applyTravel(
  campaign: Campaign,
  input: TravelInput,
): Partial<Campaign> {
  const day = campaign.day + 1;
  const location = input.to ?? campaign.current_location ?? null;
  const entry: HistoryEntry = {
    day,
    location,
    path_terrain: input.path_terrain ?? null,
    camped: input.camped ?? false,
  };

  return {
    day,
    current_location: location,
    current_path_terrain: input.path_terrain ?? null,
    history: [...campaign.history, entry],
  };
}

// End the day in place: advance the day with no movement, recorded as an
// undoable history entry.
export function applyEndDay(campaign: Campaign): Partial<Campaign> {
  const day = campaign.day + 1;
  const entry: HistoryEntry = {
    day,
    location: campaign.current_location ?? null,
    path_terrain: null,
    camped: false,
  };
  return {
    day,
    current_path_terrain: null,
    history: [...campaign.history, entry],
  };
}

// Revert the most recent travel, restoring day/location/terrain from the prior
// history entry (or the campaign start if none remain).
export function undoTravel(campaign: Campaign): Partial<Campaign> {
  if (campaign.history.length === 0) return {};

  const history = campaign.history.slice(0, -1);
  const prev = history[history.length - 1];

  return {
    history,
    day: prev?.day ?? 1,
    current_location: prev?.location ?? null,
    current_path_terrain: prev?.path_terrain ?? null,
  };
}

export function weatherForDay(
  cycle: string,
  day: number,
  extended: boolean,
): WeatherEntry | undefined {
  return getWeather(cycle, extended).find(
    (w) => w.start <= day && w.end >= day,
  );
}
