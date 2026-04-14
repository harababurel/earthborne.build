// Stub — ER has no basic weakness mechanic.
import type { Metadata } from "../slices/metadata.types";
import type { SettingsState } from "../slices/settings.types";
import type { LookupTables } from "./lookup-tables.types";
import type { ResolvedDeck } from "./types";

export function randomBasicWeaknessForDeck(
  _metadata: Metadata,
  _lookupTables: LookupTables,
  _settings: SettingsState,
  _deck: ResolvedDeck,
): string | undefined {
  return undefined;
}
