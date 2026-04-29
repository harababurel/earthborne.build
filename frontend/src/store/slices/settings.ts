import type { StateCreator } from "zustand";
import { changeLanguage } from "@/utils/i18n";
import { dehydrate } from "../persist";
import {
  queryCards,
  queryDataVersion,
  queryMetadata,
} from "../services/queries";
import type { StoreState } from ".";
import { makeLists } from "./lists";
import type {
  DecklistConfig,
  ListConfig,
  SettingsSlice,
  SettingsState,
} from "./settings.types";

export const PLAYER_DEFAULTS: ListConfig = {
  group: ["category", "type"],
  sort: ["cost", "name"],
  viewMode: "compact",
};

export const PATH_DEFAULTS: ListConfig = {
  group: ["pack", "path_set"],
  sort: ["position"],
  viewMode: "compact",
};

export const ALL_DEFAULTS: ListConfig = {
  group: ["pack", "path_set"],
  sort: ["aspect", "name"],
  viewMode: "compact",
};

export const DECK_DEFAULTS: DecklistConfig = {
  group: ["category", "type"],
  sort: ["cost", "name"],
};

export const DECK_SCANS_DEFAULTS: DecklistConfig = {
  group: ["category"],
  sort: ["type", "name"],
};

export function getInitialListsSetting(): SettingsState["lists"] {
  return {
    deck: structuredClone(DECK_DEFAULTS),
    deckScans: structuredClone(DECK_SCANS_DEFAULTS),
    all: structuredClone(ALL_DEFAULTS),
    path: structuredClone(PATH_DEFAULTS),
    player: structuredClone(PLAYER_DEFAULTS),
  };
}

export function getInitialSettings(): SettingsState {
  return {
    cardLevelDisplay: "icon-only",
    cardListsDefaultContentType: "all",
    cardSkillIconsDisplay: "simple",
    defaultStorageProvider: "local",
    devModeEnabled: false,
    cardShowIcon: true,
    cardShowDetails: true,
    cardSize: "standard",
    cardShowThumbnail: true,
    colorScheme: "botanical",
    collection: {},
    flags: {},
    fontSize: 100,
    hideWeaknessesByDefault: false,
    lists: getInitialListsSetting(),
    locale: "en",
    notesEditor: {
      defaultFormat: "paragraph",
      defaultOrigin: "player",
    },
    showAllCards: false,
    sortIgnorePunctuation: false,
  };
}

export const createSettingsSlice: StateCreator<
  StoreState,
  [],
  [],
  SettingsSlice
> = (set, get) => ({
  settings: getInitialSettings(),
  // TODO: extract to `shared` since this touches other state slices.
  async applySettings(settings, { keepListState } = {}) {
    const state = get();

    if (settings.locale !== state.settings.locale) {
      // This has to happen first, since the constructed metadata in `init` depends on the locale in some places.
      // TODO: once reprint packs are returned localized by the API, remove this.
      await changeLanguage(settings.locale);

      await state.init(queryMetadata, queryDataVersion, queryCards, {
        refresh: true,
        locale: settings.locale,
        overrides: {
          lists: keepListState
            ? state.lists
            : makeLists(settings, state.metadata),
          settings: {
            ...state.settings,
            ...settings,
          },
        },
      });
    } else {
      set((state) => ({
        settings,
        lists: makeLists(settings, state.metadata),
      }));

      await dehydrate(get(), "app");
    }
  },
  async setSettings(payload) {
    set((state) => ({
      settings: {
        ...state.settings,
        ...payload,
      },
    }));

    await dehydrate(get(), "app");
  },
  async toggleFlag(key) {
    set((state) => ({
      settings: {
        ...state.settings,
        flags: {
          ...state.settings.flags,
          [key]: !state.settings.flags?.[key],
        },
      },
    }));

    await dehydrate(get(), "app");
  },
});
