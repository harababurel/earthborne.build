import type { Card } from "@earthborne-build/shared";
import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import { DEFAULT_LIST_SORT_ID } from "@/utils/constants";
import type { Filter } from "@/utils/fp";
import { and, not } from "@/utils/fp";
import { parse as parseBuildQl } from "../lib/buildql/parser";
import { filterEncounterCards, filterType } from "../lib/filtering";
import type { ResolvedDeck } from "../lib/types";
import { selectBuildQlInterpreter } from "../selectors/shared";
import type { StoreState } from ".";
import {
  isAspectRequirementFilter,
  isAssetFilter,
  isCardTypeFilter,
  isCostFilter,
  isEquipFilter,
  isLevelFilter,
  isMultiSelectFilter,
  isOwnershipFilter,
  isPropertiesFilter,
  isRangeFilter,
  isSkillIconsFilter,
  isSubtypeFilter,
} from "./lists.type-guards";
import type {
  AspectRequirementFilter,
  AssetFilter,
  CostFilter,
  EquipFilter,
  FilterKey,
  FilterMapping,
  LevelFilter,
  List,
  ListDisplay,
  ListsSlice,
  OwnershipFilter,
  PropertiesFilter,
  Search,
  SkillIconsFilter,
  SubtypeFilter,
} from "./lists.types";
import type { Metadata } from "./metadata.types";
import type { DecklistConfig, SettingsState } from "./settings.types";

const SYSTEM_FILTERS: Filter[] = [];

function getInitialList() {
  if (window.location.href.includes("/deck/create")) {
    return "create_deck";
  }

  if (window.location.href.includes("/deck/")) {
    return "editor";
  }

  return "index";
}

export const createListsSlice: StateCreator<StoreState, [], [], ListsSlice> = (
  set,
  get,
) => ({
  activeList: getInitialList(),
  lists: {},

  resetFilters() {
    set((state) => {
      const activeList = state.activeList;
      assert(activeList, "no active list is defined.");

      const list = state.lists[activeList];
      assert(list, `list ${activeList} not defined.`);

      const initialValues = mergeInitialValues(
        list.initialState.filterValues,
        state.settings,
        state.metadata,
      );

      return {
        lists: {
          ...state.lists,
          [activeList]: {
            ...list.initialState,
            display: getDisplaySettings(initialValues, state.settings),
            initialState: list.initialState,
          },
        },
      };
    });
  },

  resetFilter(id) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      const filterValues = { ...list.filterValues };
      assert(filterValues[id], `${state.activeList} has not filter ${id}.`);

      if (filterValues[id].locked) return state;

      filterValues[id] = makeFilterValue(filterValues[id].type);

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            filterValues,
          },
        },
      };
    });
  },

  setActiveList(value) {
    if (value == null) {
      set({ activeList: undefined });
    } else {
      set((state) => {
        assert(state.lists[value], `list ${value} not defined.`);
        return { activeList: value };
      });
    }
  },

  setFilterOpen(id, open) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      const filterValues = { ...list.filterValues };
      assert(filterValues[id], `${state.activeList} has not filter ${id}.`);

      filterValues[id] = { ...filterValues[id], open };

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            filterValues,
          },
        },
      };
    });
  },

  setFilterValue(id, payload) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      let list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);
      list = { ...list };

      const filterValues = { ...list.filterValues };
      assert(filterValues[id], `${state.activeList} has not filter ${id}.`);

      if (filterValues[id].locked) return state;

      switch (filterValues[id].type) {
        case "illustrator":
        case "action":
        case "approach_icons":
        case "cycle":
        case "encounter_set":
        case "set":
        case "trait":
        case "type":
        case "pack":
        case "faction": {
          assert(
            isMultiSelectFilter(payload),
            `filter ${id} value must be an array.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }

        case "aspect_requirement": {
          const currentValue = filterValues[id]
            .value as AspectRequirementFilter;
          const value = { ...currentValue, ...payload };

          assert(
            isAspectRequirementFilter(value),
            `filter ${id} value must be an aspect requirement object.`,
          );

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "card_type": {
          assert(
            isCardTypeFilter(payload),
            `filter ${id} value must be a string.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };

          const nextDisplaySettings = getDisplaySettings(
            Object.fromEntries(
              list.filters.map(
                (filter, i) => [filter, filterValues[i].value] as const,
              ),
            ),
            state.settings,
          );

          list.initialState.display = nextDisplaySettings;

          if (list.displaySortSelection === DEFAULT_LIST_SORT_ID) {
            list.displaySortSelection = DEFAULT_LIST_SORT_ID;

            list.display = {
              ...list.display,
              sorting: nextDisplaySettings.sorting,
              grouping: nextDisplaySettings.grouping,
            };
          }

          break;
        }

        case "cost": {
          const currentValue = filterValues[id].value as CostFilter;
          const value = { ...currentValue, ...payload };

          assert(
            isCostFilter(value),
            `filter ${id} value must be a cost object.`,
          );

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "level": {
          const currentValue = filterValues[id].value as LevelFilter;
          const value = { ...currentValue, ...payload };

          assert(
            isLevelFilter(value),
            `filter ${id} value must be an level object.`,
          );

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "equip": {
          assert(
            isEquipFilter(payload),
            `filter ${id} value must be an equip range.`,
          );
          filterValues[id] = {
            ...filterValues[id],
            value: payload as EquipFilter,
          };
          break;
        }

        case "ownership": {
          assert(
            isOwnershipFilter(payload),
            `filter ${id} value must be a string.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }

        case "role": {
          assert(
            typeof payload === "string",
            `filter ${id} value must be a string.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }

        case "subtype": {
          const currentValue = filterValues[id].value as SubtypeFilter;
          const value = { ...currentValue, ...payload };

          assert(
            isSubtypeFilter(value),
            `filter ${id} value must be a map of booleans.`,
          );

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "properties": {
          const currentValue = filterValues[id].value as PropertiesFilter;
          const value = { ...currentValue, ...payload };

          assert(
            isPropertiesFilter(value),
            `filter ${id} value must be a map of booleans.`,
          );

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "asset": {
          const currentValue = filterValues[id].value as AssetFilter;
          const value = { ...currentValue, ...payload };
          assert(
            isAssetFilter(value),
            `filter ${id} value must be an asset object.`,
          );

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "health":
        case "sanity": {
          assert(
            isRangeFilter(payload),
            `filter ${id} value must be an array of two numbers.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }

        case "skill_icons": {
          assert(
            isSkillIconsFilter(payload),
            `filter ${id} value must be an object.`,
          );
          const currentValue = filterValues[id].value as SkillIconsFilter;
          const value = { ...currentValue, ...payload };

          filterValues[id] = { ...filterValues[id], value };
          break;
        }
      }

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            filterValues,
          },
        },
      };
    });
  },

  setSearchFlag(flag, value, deck) {
    let state = get();

    assert(state.activeList, "no active list is defined.");
    const activeList = state.activeList;

    let list = state.lists[state.activeList];
    assert(list, `list ${state.activeList} not defined.`);

    set((state) => ({
      lists: {
        ...state.lists,
        [activeList]: {
          ...list,
          search: {
            ...list.search,
            [flag]: value,
          },
        },
      },
    }));

    if (list.search.mode === "buildql") {
      state = get();

      list = state.lists[activeList];
      assert(list, `list ${activeList} not defined.`);

      const { filter: buildQlSearch, error: buildQlError } = evaluateBuildQl(
        state,
        list.search.value,
        deck,
      );

      if (buildQlSearch) {
        set((state) => ({
          lists: {
            ...state.lists,
            [activeList]: {
              ...list,
              search: {
                ...list.search,
                buildQlSearch,
                buildQlError,
              },
            },
          },
        }));
      }
    }
  },

  setSearchValue(value, deck) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      const { filter: buildQlSearch, error: buildQlError } = evaluateBuildQl(
        state,
        value,
        deck,
      );

      const isBuildQl =
        value && (list.search.mode === "buildql" || !!buildQlSearch);

      const mode = isBuildQl ? "buildql" : "simple";

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            search: {
              ...list.search,
              mode,
              buildQlError: isBuildQl ? buildQlError : undefined,
              buildQlSearch:
                isBuildQl && !buildQlSearch
                  ? list.search.buildQlSearch
                  : buildQlSearch,
              value,
            },
          },
        },
      };
    });
  },

  setFiltersEnabled(value) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            filtersEnabled: value,
          },
        },
      };
    });
  },

  setListViewMode(viewMode) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            display: {
              ...list.display,
              viewMode,
            },
          },
        },
      };
    });
  },

  setListSort(config) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      let preset: Pick<ListDisplay, "grouping" | "sorting">;

      if (config) {
        preset = {
          sorting: config.sort,
          grouping: config.group,
        };
      } else {
        preset = {
          sorting: list.initialState.display.sorting,
          grouping: list.initialState.display.grouping,
        };
      }

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            display: {
              ...list.display,
              ...preset,
            },
            displaySortSelection: config
              ? sortPresetId(config)
              : DEFAULT_LIST_SORT_ID,
          },
        },
      };
    });
  },

  addList(
    key,
    initialValues,
    opts = {
      display: undefined,
      fanMadeCycleCodes: undefined,
      search: "",
      showOwnershipFilter: true,
      showRoleFilter: true,
      additionalFilters: ["illustrator"],
      lockedFilters: new Set<FilterKey>(),
    },
  ) {
    set((state) => {
      const lists = { ...state.lists };

      const values = mergeInitialValues(
        initialValues ?? {},
        state.settings,
        state.metadata,
      );

      const display = {
        ...getDisplaySettings(values, state.settings),
        ...opts.display,
      };

      lists[key] = makeList({
        fanMadeCycleCodes: opts.fanMadeCycleCodes,
        display,
        filters: cardsFilters({
          additionalFilters: opts.additionalFilters ?? ["illustrator"],
          showOwnershipFilter: opts.showOwnershipFilter,
          showRoleFilter: opts.showRoleFilter,
        }),
        initialValues: values,
        key,
        systemFilter: and([
          ...SYSTEM_FILTERS,
          ...(opts.systemFilter ? [opts.systemFilter] : []),
        ]),
        search: {
          value: opts.search ?? "",
          mode: "simple",
          includeBacks: false,
          includeFlavor: false,
          includeGameText: false,
          includeName: true,
        },
        lockedFilters: opts.lockedFilters ?? new Set<FilterKey>(),
      });

      return { lists };
    });
  },

  removeList(key) {
    set((state) => {
      if (!state.lists[key]) return state;
      const lists = { ...state.lists };
      delete lists[key];
      return { lists };
    });
  },
});

function evaluateBuildQl(
  state: StoreState,
  value: string,
  deck?: ResolvedDeck,
) {
  try {
    const interpreter = selectBuildQlInterpreter(state, deck);
    const filter = interpreter.evaluate(parseBuildQl(value));
    filter({} as Card); // test for runtime errors
    return { filter, error: undefined };
  } catch (err) {
    return { filter: undefined, error: err as Error };
  }
}

function makeSearch(): Search {
  return {
    value: "",
    mode: "simple",
    includeBacks: false,
    includeFlavor: false,
    includeGameText: false,
    includeName: true,
  };
}

function makeFilterObject<K extends FilterKey>(
  type: K,
  value: FilterMapping[K],
  open = false,
  locked = false,
) {
  return {
    open,
    locked,
    type,
    value,
  };
}

function makeFilterValue(
  type: FilterKey,
  initialValue?: unknown,
  locked = false,
) {
  switch (type) {
    case "asset": {
      return makeFilterObject(
        type,
        isAssetFilter(initialValue)
          ? initialValue
          : {
              health: undefined,
              sanity: undefined,
              skillBoosts: [],
              slots: [],
              uses: [],
              healthX: false,
            },
        false,
        locked,
      );
    }

    case "card_type": {
      return makeFilterObject(
        type,
        isCardTypeFilter(initialValue) ? initialValue : "",
        false,
        locked,
      );
    }

    case "cost": {
      return makeFilterObject(
        type,
        isCostFilter(initialValue)
          ? initialValue
          : {
              range: undefined,
              even: false,
              odd: false,
              x: false,
            },
        false,
        locked,
      );
    }

    case "aspect_requirement": {
      return makeFilterObject(
        type,
        isAspectRequirementFilter(initialValue)
          ? initialValue
          : {
              aspects: [],
              range: undefined,
            },
        false,
        locked,
      );
    }

    case "level": {
      return makeFilterObject(
        type,
        isLevelFilter(initialValue)
          ? initialValue
          : {
              range: undefined,
            },
        false,
        locked,
      );
    }

    case "equip":
    case "health":
    case "sanity": {
      return makeFilterObject(
        type,
        isRangeFilter(initialValue) ? initialValue : undefined,
        false,
        locked,
      );
    }

    case "illustrator":
    case "action":
    case "approach_icons":
    case "cycle":
    case "encounter_set":
    case "pack":
    case "set":
    case "trait":
    case "type":
    case "faction": {
      return makeFilterObject(
        type,
        isMultiSelectFilter(initialValue) ? initialValue : [],
        false,
        locked,
      );
    }

    case "subtype": {
      return makeFilterObject(
        type,
        isSubtypeFilter(initialValue)
          ? initialValue
          : {
              none: true,
              weakness: true,
              basicweakness: true,
            },
        false,
        locked,
      );
    }

    case "ownership": {
      return makeFilterObject(
        type,
        isOwnershipFilter(initialValue) ? initialValue : "all",
        false,
        locked,
      );
    }

    case "properties": {
      return makeFilterObject(
        type,
        isPropertiesFilter(initialValue)
          ? initialValue
          : {
              ambush: false,
              conduit: false,
              disconnected: false,
              expert: false,
              fatiguing: false,
              friendly: false,
              manifestation: false,
              obstacle: false,
              persistent: false,
              setup: false,
              unique: false,
            },
        true,
        locked,
      );
    }

    case "role": {
      return makeFilterObject(
        type,
        typeof initialValue === "string" ? initialValue : undefined,
        false,
        locked,
      );
    }

    case "skill_icons": {
      return makeFilterObject(
        "skill_icons",
        isSkillIconsFilter(initialValue)
          ? initialValue
          : {
              agility: undefined,
              combat: undefined,
              intellect: undefined,
              willpower: undefined,
              wild: undefined,
              any: undefined,
            },
        false,
        locked,
      );
    }
    default:
      throw new Error(`Unhandled filter key: ${type}`);
  }
}

type MakeListOptions = {
  fanMadeCycleCodes?: string[];
  display: ListDisplay;
  filters: FilterKey[];
  initialValues?: Partial<Record<FilterKey, unknown>>;
  key: string;
  lockedFilters?: Set<FilterKey>;
  search?: Search;
  systemFilter?: Filter;
};

function makeList({
  fanMadeCycleCodes,
  key,
  filters,
  display,
  systemFilter,
  initialValues,
  search,
  lockedFilters = new Set<FilterKey>(),
}: MakeListOptions): List {
  const list = {
    fanMadeCycleCodes,
    filters,
    filterValues: filters.reduce<List["filterValues"]>((acc, curr, i) => {
      const locked = lockedFilters.has(curr);
      acc[i] = makeFilterValue(curr, initialValues?.[curr], locked);
      return acc;
    }, {}),
    filtersEnabled: true,
    display,
    displaySortSelection: DEFAULT_LIST_SORT_ID,
    key,
    systemFilter,
    search: search ?? makeSearch(),
  };

  return {
    ...list,
    initialState: { ...list },
  };
}

function cardsFilters({
  additionalFilters = [] as FilterKey[],
  showOwnershipFilter = false,
  showRoleFilter: _showRoleFilter = false,
}): FilterKey[] {
  const filters: FilterKey[] = [
    "type",
    "set",
    "aspect_requirement",
    "cost",
    "equip",
    "approach_icons",
    "trait",
    "properties",
    "pack",
    ...additionalFilters,
  ];

  if (showOwnershipFilter) filters.push("ownership");

  return Array.from(new Set(filters));
}

function properties() {
  return [
    "ambush",
    "conduit",
    "disconnected",
    "expert",
    "fatiguing",
    "friendly",
    "manifestation",
    "obstacle",
    "persistent",
    "setup",
    "unique",
  ];
}

export function makeLists(
  settings: SettingsState,
  metadata: Metadata,
  _initialValues?: Partial<Record<FilterKey, unknown>>,
) {
  const initialValues = mergeInitialValues(
    _initialValues ?? {},
    settings,
    metadata,
  );

  const systemFilters = [...SYSTEM_FILTERS];

  const systemFilter = and(systemFilters);

  return {
    create_deck: makeList({
      display: {
        grouping: settings.lists.role.group,
        sorting: settings.lists.role.sort,
        viewMode: settings.lists.role.viewMode,
      },
      systemFilter: and([
        systemFilter,
        filterType(["role"]) ?? (() => true),
        not(filterEncounterCards),
      ]),
      initialValues,
      key: "create_deck",
      filters: ["ownership", "pack"],
    }),
    editor: makeList({
      display: getDisplaySettings(initialValues, settings),
      initialValues,
      key: "editor",
      systemFilter,
      filters: cardsFilters({
        showOwnershipFilter: true,
        showRoleFilter: false,
      }),
    }),
    index: makeList({
      display: getDisplaySettings(initialValues, settings),
      initialValues,
      key: "index",
      systemFilter,
      filters: cardsFilters({
        additionalFilters: ["illustrator"],
        showOwnershipFilter: true,
        showRoleFilter: true,
      }),
    }),
  };
}

function mergeInitialValues(
  initialValues: Partial<Record<FilterKey, unknown>>,
  settings: SettingsState,
  metadata: Metadata,
) {
  return {
    ...initialValues,
    card_type: initialValues.card_type ?? "player",
    ownership: initialValues.ownership ?? getInitialOwnershipFilter(settings),
    pack: initialValues.pack ?? getInitialPackFilter(settings, metadata),
  };
}

function getInitialPackFilter(
  settings: SettingsState,
  metadata: Metadata,
): string[] {
  if (settings.showAllCards) return [];

  return Object.keys(metadata.packs).filter(
    (code) => settings.collection[code],
  );
}

function getInitialOwnershipFilter(_settings: SettingsState): OwnershipFilter {
  return "all";
}

function getDisplaySettings(
  values: Partial<Record<FilterKey, unknown>>,
  settings: SettingsState,
) {
  switch (values.card_type) {
    case "player": {
      return {
        grouping: settings.lists.player.group,
        sorting: settings.lists.player.sort,
        viewMode: settings.lists.player.viewMode,
        properties: properties(),
      };
    }

    case "encounter": {
      return {
        grouping: settings.lists.encounter.group,
        sorting: settings.lists.encounter.sort,
        viewMode: settings.lists.encounter.viewMode,
        properties: properties(),
      };
    }

    default: {
      return {
        grouping: settings.lists.mixed.group,
        sorting: settings.lists.mixed.sort,
        viewMode: settings.lists.mixed.viewMode,
        properties: properties(),
      };
    }
  }
}

export function sortPresetId(config: DecklistConfig): string {
  return [...config.group, ...config.sort].join("|");
}
