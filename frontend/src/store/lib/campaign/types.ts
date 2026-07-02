import type { CampaignCycle } from "@earthborne-build/shared";

export type ExpansionAction = "add" | "remove";

export type ExpansionMapCondition = {
  expansion: string;
  action: ExpansionAction;
};

export type LocationType = "location" | "trail" | "general";

// "none" = a direct connection with no path terrain between two locations.
export type PathId = string;

export type PathTypeDef = {
  id: PathId;
  color: string;
  cycles: string[];
};

export type RawLocation = {
  id: string;
  type: LocationType;
  cycles: string[];
  background?: boolean;
  expansionConditions?: ExpansionMapCondition[];
};

export type RawConnection = {
  locA: string;
  locB: string;
  path: PathId;
  restriction?: string;
  cycles?: string[];
  expansionConditions?: ExpansionMapCondition[];
};

// A location resolved for a specific cycle + expansion set, with its edges.
export type MapLocation = Omit<RawLocation, "expansionConditions"> & {
  connections: LocationConnection[];
};

export type LocationConnection = {
  id: string; // neighbouring location id
  path: PathId;
  restriction?: string;
};

export type WeatherEntry = {
  start: number;
  end: number;
  valley_id: string;
  underground_id?: string;
};

export type ExpansionDef = {
  id: string;
  cycles: string[];
};

export type GuideEntries = {
  fixed: Record<string, Record<string, string[]>>;
  expansionStarting: Record<string, { day: number; guides: string[] }[]>;
};

export type CampaignContent = {
  cycles: { id: CampaignCycle }[];
  expansions: ExpansionDef[];
  pathTypes: PathTypeDef[];
  locations: RawLocation[];
  connections: RawConnection[];
  weather: {
    core: WeatherEntry[];
    coreExtended: WeatherEntry[];
    loa: WeatherEntry[];
  };
  maxDay: { core: number; coreExtended: number; loa: number };
  // Per-day moon-phase SVG path data (viewBox 0 0 32 32); "" = new moon.
  moonPaths: Record<string, string>;
  guideEntries: GuideEntries;
};
