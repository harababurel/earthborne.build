import type { Campaign, CampaignCycle } from "@earthborne-build/shared";
import rawData from "./data/campaign-data.json";
import type {
  CampaignContent,
  ExpansionDef,
  ExpansionMapCondition,
  MapLocation,
  PathCardDefinition,
  PathTypeDef,
  WeatherEntry,
} from "./types";

const content = rawData as CampaignContent;

export function getCampaignCycles(): CampaignCycle[] {
  return content.cycles.map((c) => c.id);
}

export function getCampaignExpansions(cycle?: string): ExpansionDef[] {
  if (!cycle) return [];
  return content.expansions.filter((e) => e.cycles.includes(cycle));
}

export function getPathTypes(cycle: string): PathTypeDef[] {
  return content.pathTypes.filter((p) => p.cycles.includes(cycle));
}

export function getPathType(id: string): PathTypeDef | undefined {
  return content.pathTypes.find((p) => p.id === id);
}

export function getPathCards(): PathCardDefinition[] {
  return content.pathCards;
}

// Weather id (valley_id / underground_id) → its card code, for hover previews.
export const WEATHER_CARD_CODES: Record<string, string> = {
  a_perfect_day: "01456",
  downpour: "01458",
  howling_wind: "01460",
  enveloping_silence: "02377",
  glitterain: "02379",
  shimmering_runoff: "02380",
};

// SVG path data for a day's moon phase ("" = new moon). Days beyond the data
// clamp to the last known day.
export function moonPathForDay(day: number): string {
  return content.moonPaths[String(day)] ?? content.moonPaths["30"] ?? "";
}

// Card-data pack ids that belong to this campaign (core=ebr + active valley
// expansions; loa=loa). Scopes the metadata-sourced mission and path pickers.
export function campaignPacks(
  campaign: Pick<Campaign, "cycle_id" | "expansions">,
): string[] {
  if (campaign.cycle_id === "loa") return ["loa"];
  return ["ebr", ...campaign.expansions];
}

export function getGuideEntries() {
  return content.guideEntries;
}

// Resolve the valley map for a cycle + active expansions, building bidirectional
// connections — ported from rangers-db `getMapLocations`.
export function getMapLocations(
  cycle: string,
  expansions: string[],
): Record<string, MapLocation> {
  const selected = new Set(expansions);
  const map: Record<string, MapLocation> = {};

  for (const loc of content.locations) {
    if (!loc.cycles.includes(cycle)) continue;
    if (shouldSkip(loc.expansionConditions, selected)) continue;
    map[loc.id] = {
      id: loc.id,
      type: loc.type,
      cycles: loc.cycles,
      ...(loc.background ? { background: true } : {}),
      connections: [],
    };
  }

  for (const c of content.connections) {
    const locA = map[c.locA];
    const locB = map[c.locB];
    if (!locA || !locB) continue;
    if (c.cycles && !c.cycles.includes(cycle)) continue;
    if (shouldSkip(c.expansionConditions, selected)) continue;

    locA.connections.push({
      id: c.locB,
      path: c.path,
      restriction: c.restriction,
    });
    locB.connections.push({ id: c.locA, path: c.path });
  }

  return map;
}

export function getMapLocationsForCampaign(
  campaign: Pick<Campaign, "cycle_id" | "expansions">,
): Record<string, MapLocation> {
  return getMapLocations(campaign.cycle_id, campaign.expansions);
}

// Per-cycle, day-range weather. Core campaigns can extend past day 30.
export function getWeather(cycle: string, extended: boolean): WeatherEntry[] {
  if (cycle === "loa") return content.weather.loa;
  return extended
    ? [...content.weather.core, ...content.weather.coreExtended]
    : content.weather.core;
}

export function getMaxDay(cycle: string, extended: boolean): number {
  if (cycle === "loa") return content.maxDay.loa;
  return extended ? content.maxDay.coreExtended : content.maxDay.core;
}

function shouldSkip(
  conditions: ExpansionMapCondition[] | undefined,
  selected: Set<string>,
): boolean {
  if (!conditions) return false;
  return conditions.some((cond) =>
    cond.action === "add"
      ? !selected.has(cond.expansion)
      : selected.has(cond.expansion),
  );
}
