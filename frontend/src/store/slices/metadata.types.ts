import type { Card } from "@arkham-build/shared";
import type { DataVersion } from "../schemas/data-version.schema";
import type { EncounterSet } from "../schemas/encounter-set.schema";
import type { Pack } from "../schemas/pack.schema";

export type Metadata = {
  cards: Record<string, Card>;
  dataVersion?: DataVersion;
  packs: Record<string, Pack>;
  encounterSets: Record<string, EncounterSet>;

  // AH-specific fields kept as empty stubs so callers don't need updating yet.
  // biome-ignore lint/suspicious/noExplicitAny: AH stubs
  cycles: Record<string, any>;
  // biome-ignore lint/suspicious/noExplicitAny: AH stubs
  factions: Record<string, any>;
  // biome-ignore lint/suspicious/noExplicitAny: AH stubs
  subtypes: Record<string, any>;
  // biome-ignore lint/suspicious/noExplicitAny: AH stubs
  types: Record<string, any>;
};

export type MetadataSlice = {
  metadata: Metadata;
};
