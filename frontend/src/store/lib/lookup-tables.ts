import type { Card } from "@arkham-build/shared";
import { splitMultiValue } from "@/utils/card-utils";
import { time, timeEnd } from "@/utils/time";
import type { Metadata } from "../slices/metadata.types";
import type { SettingsState } from "../slices/settings.types";
import type { LookupTable, LookupTables } from "./lookup-tables.types";

function getInitialLookupTables(): LookupTables {
  return {
    actions: {},
    encounterCode: {},
    level: {},
    packsByCycle: {},
    properties: {
      fast: {},
      succeedBy: {},
    },
    relations: {
      advanced: {},
      base: {},
      basePrints: {},
      bonded: {},
      bound: {},
      duplicates: {},
      fronts: {},
      level: {},
      otherVersions: {},
      parallel: {},
      parallelCards: {},
      sideDeckRequiredCards: {},
      replacement: {},
      reprints: {},
      requiredCards: {},
      restrictedTo: {},
    },
    encounterCodesByPack: {},
    reprintPacksByPack: {},
    skillBoosts: {},
    subtypeCode: {},
    traits: {},
    typeCode: {},
    uses: {},
  };
}

export function createLookupTables(
  metadata: Metadata,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _settings: SettingsState,
) {
  time("refresh_lookup_tables");
  const lookupTables = getInitialLookupTables();

  const cards = Object.values(metadata.cards);

  for (const card of cards) {
    addCardToLookupTables(lookupTables, card);
  }

  addPacksToLookupTables(metadata, lookupTables);

  timeEnd("refresh_lookup_tables");

  return lookupTables;
}

function setInLookupTable<T extends string | number>(
  code: keyof LookupTable<T>[T] | string,
  index: LookupTable<T>,
  key: T,
) {
  if (index[key]) {
    index[key][code] = 1;
  } else {
    index[key] = { [code]: 1 as const };
  }
}

function addCardToLookupTables(tables: LookupTables, card: Card) {
  indexByCodes(tables, card);
  indexByTraits(tables, card);
}

function indexByCodes(tables: LookupTables, card: Card) {
  setInLookupTable(card.code, tables.typeCode, card.type_code);
}

function indexByTraits(tables: LookupTables, card: Card) {
  if (!card.traits) return;
  for (const trait of splitMultiValue(card.traits)) {
    setInLookupTable(card.code, tables.traits, trait);
  }
}

function addPacksToLookupTables(
  metadata: Metadata,
  lookupTables: LookupTables,
) {
  const packs = Object.values(metadata.packs);

  for (const pack of packs) {
    // ER has no cycles; use pack code as the cycle key so packsByCycle is
    // populated consistently (some UI code iterates it).
    setInLookupTable(pack.code, lookupTables.packsByCycle, pack.cycle_code ?? pack.code);
  }
}
