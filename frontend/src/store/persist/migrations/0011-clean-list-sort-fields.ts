import type { StoreState } from "@/store/slices";
import type { GroupingType, SortingType } from "@/store/slices/lists.types";
import {
  ALL_DEFAULTS,
  DECK_DEFAULTS,
  DECK_SCANS_DEFAULTS,
  PATH_DEFAULTS,
  PLAYER_DEFAULTS,
} from "@/store/slices/settings";
import type { DecklistConfig, ListConfig } from "@/store/slices/settings.types";

const VALID_GROUP = new Set([
  "approach",
  "aspect",
  "category",
  "cost",
  "none",
  "pack",
  "path_set",
  "type",
]);

const VALID_SORT = new Set([
  "approach",
  "aspect",
  "category",
  "cost",
  "equip",
  "name",
  "pack",
  "position",
  "type",
]);

function cleanGroup(group: string[]): GroupingType[] {
  return group
    .map((g) => (g === "encounter_set" ? "path_set" : g))
    .filter((g) => VALID_GROUP.has(g)) as GroupingType[];
}

function cleanSort(sort: string[]): SortingType[] {
  return sort.filter((s) => VALID_SORT.has(s)) as SortingType[];
}

function cleanListConfig(config: ListConfig, defaults: ListConfig): ListConfig {
  const group = cleanGroup(config.group ?? []);
  const sort = cleanSort(config.sort ?? []);
  return {
    ...config,
    group: group.length ? group : [...defaults.group],
    sort: sort.length ? sort : [...defaults.sort],
  };
}

function cleanDecklistConfig(
  config: DecklistConfig,
  defaults: DecklistConfig,
): DecklistConfig {
  const group = cleanGroup(config.group ?? []);
  const sort = cleanSort(config.sort ?? []);
  return {
    group: group.length ? group : [...defaults.group],
    sort: sort.length ? sort : [...defaults.sort],
  };
}

function migrate(state: Partial<StoreState>, version: number) {
  if (version >= 12) {
    return state;
  }

  const lists = (state.settings as StoreState["settings"] | undefined)?.lists;
  if (!lists) return state;

  if (lists.all) {
    lists.all = cleanListConfig(lists.all as ListConfig, ALL_DEFAULTS);
  }
  if (lists.player) {
    lists.player = cleanListConfig(lists.player as ListConfig, PLAYER_DEFAULTS);
  }
  if (lists.path) {
    lists.path = cleanListConfig(lists.path as ListConfig, PATH_DEFAULTS);
  }
  if (lists.deck) {
    lists.deck = cleanDecklistConfig(
      lists.deck as DecklistConfig,
      DECK_DEFAULTS,
    );
  }
  if (lists.deckScans) {
    lists.deckScans = cleanDecklistConfig(
      lists.deckScans as DecklistConfig,
      DECK_SCANS_DEFAULTS,
    );
  }

  return state;
}

export default migrate;
