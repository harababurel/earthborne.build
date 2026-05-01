import type { StateCreator } from "zustand";
import {
  applyDeckEdits,
  getChangeRecord,
  hasQuantityEdits,
  markDeckbuildingStateEvolved,
} from "@/store/lib/deck-edits";
import { createDeck } from "@/store/lib/deck-factory";
import { buildStarterDecks } from "@/store/lib/predefined-decks";

import { assert } from "@/utils/assert";
import { randomId } from "@/utils/crypto";
import { download } from "@/utils/download";
import { time, timeEnd } from "@/utils/time";
import { prepareBackup, restoreBackup } from "../lib/backup";
import { mapValidationToProblem } from "../lib/deck-io";
import { applyLocalData } from "../lib/local-data";
import { mappedByCode } from "../lib/metadata-utils";
import { resolveDeck } from "../lib/resolve-deck";
import { dehydrate, hydrate } from "../persist";
import type { DataVersion } from "../schemas/data-version.schema";
import { selectDeckValid } from "../selectors/decks";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "../selectors/shared";
import type { StoreState } from ".";
import type { AppSlice } from "./app.types";
import { makeLists } from "./lists";
import { getInitialMetadata } from "./metadata";
import type { Metadata } from "./metadata.types";

function getInitialAppState() {
  return {
    clientId: "",
  };
}

export const createAppSlice: StateCreator<StoreState, [], [], AppSlice> = (
  set,
  get,
) => ({
  app: getInitialAppState(),

  async init(
    queryMetadata,
    queryDataVersion,
    queryCards,
    { refresh, locale, overrides } = {},
  ) {
    const persistedState = await hydrate();

    if (!refresh && persistedState?.metadata?.dataVersion?.cards_updated_at) {
      const remoteDataVersion = await queryDataVersion(locale);

      if (
        dataVersionKey(remoteDataVersion) !==
          dataVersionKey(persistedState.metadata.dataVersion) ||
        !persistedState.metadata.encounterSets ||
        Object.keys(persistedState.metadata.encounterSets).length === 0
      ) {
        return get().init(queryMetadata, queryDataVersion, queryCards, {
          refresh: true,
          locale,
          overrides,
        });
      }

      const metadata = applyLocalData(persistedState.metadata);
      synthesiseCycles(metadata);

      set((prev) => {
        const merged = mergeInitialState(prev, persistedState, overrides);

        // Auto-populate collection with known packs from metadata
        for (const packCode of Object.keys(metadata.packs)) {
          if (merged.settings.collection[packCode] === undefined) {
            merged.settings.collection[packCode] = true;
          }
        }

        return {
          ...merged,
          lists: {
            ...makeLists(merged.settings, metadata),
            ...merged.lists,
          },
          metadata,
          ui: {
            ...prev.ui,
            initialized: true,
          },
        };
      });

      return false;
    }

    time("query_data");
    const [metadataResponse, dataVersionResponse, cards] = await Promise.all([
      queryMetadata(locale),
      queryDataVersion(locale),
      queryCards(locale),
    ]);
    timeEnd("query_data");

    time("create_store_data");
    const metadata: Metadata = {
      ...getInitialMetadata(),
      dataVersion: dataVersionResponse,
      packs: mappedByCode(metadataResponse.pack),
      encounterSets: mappedByCode(metadataResponse.encounterSet),
      cards: {},
    };

    synthesiseCycles(metadata);

    for (const card of cards) {
      metadata.cards[card.code] = card;
    }

    set((prev) => {
      const merged = mergeInitialState(prev, persistedState, overrides);

      // Auto-populate collection with new packs from metadata
      for (const packCode of Object.keys(metadata.packs)) {
        if (merged.settings.collection[packCode] === undefined) {
          merged.settings.collection[packCode] = true;
        }
      }

      return {
        ...merged,
        metadata,
        ui: {
          ...merged.ui,
        },
        lists: {
          ...makeLists(merged.settings, metadata),
          ...merged.lists,
        },
      };
    });

    timeEnd("create_store_data");

    await dehydrate(get(), "all");

    set((prev) => ({
      ui: {
        ...prev.ui,
        initialized: true,
      },
    }));

    return true;
  },
  async createDeck() {
    const state = get();
    const _metadata = selectMetadata(state);

    assert(state.deckCreate, "DeckCreate state must be initialized.");
    assert(
      state.deckCreate.roleCode,
      "Role must be selected before creating a deck.",
    );

    const slots = {
      ...state.deckCreate.personalitySlots,
      ...state.deckCreate.backgroundSlots,
      ...state.deckCreate.specialtySlots,
      ...state.deckCreate.outsideInterestSlots,
    };

    const specialty = state.deckCreate.specialty ?? "unknown";

    const deck = createDeck({
      name: state.deckCreate.name,
      slots,
      role_code: state.deckCreate.roleCode,
      aspect_code: state.deckCreate.aspectCode ?? "unknown",
      background: state.deckCreate.background ?? "unknown",
      specialty,
      rewards: null,
      displaced: null,
      maladies: null,
    });

    set((prev) => ({
      data: {
        ...prev.data,
        decks: {
          ...prev.data.decks,
          [deck.id]: deck,
        },
        history: {
          ...prev.data.history,
          [deck.id]: [],
        },
      },
      deckCreate: undefined,
    }));

    await dehydrate(get(), "app");

    if (state.deckCreate.provider === "shared") {
      await state.createShare(deck.id as string);
    }

    return deck.id;
  },
  async deleteDeck(id, cb) {
    const state = get();

    const deck = state.data.decks[id];

    await Promise.allSettled(
      [...state.data.history[id], deck.id].map((curr) =>
        state.deleteShare(curr as string),
      ),
    );

    cb?.();

    set((prev) => {
      const history = { ...prev.data.history };
      const undoHistory = { ...prev.data.undoHistory };
      const decks = { ...prev.data.decks };
      const deckEdits = { ...prev.deckEdits };

      delete deckEdits[id];
      delete decks[id];

      const historyEntries = history[id] ?? [];

      for (const prevId of historyEntries) {
        delete decks[prevId];
        delete deckEdits[prevId];
        delete undoHistory[prevId];
      }

      delete history[id];
      delete undoHistory[id];

      return {
        data: {
          ...prev.data,
          decks,
          history,
          undoHistory,
        },
        deckEdits,
      };
    });

    await dehydrate(get(), "app", "edits");
  },
  async deleteAllDecks() {
    set((state) => {
      const decks = { ...state.data.decks };
      const history = { ...state.data.history };
      const edits = { ...state.deckEdits };
      const undoHistory = { ...state.data.undoHistory };

      for (const id of Object.keys(decks)) {
        delete decks[id];
        delete history[id];
        delete edits[id];
        delete undoHistory[id];
      }

      return {
        data: {
          ...state.data,
          decks,
          history,
        },
      };
    });

    await dehydrate(get(), "app", "edits");

    if (Object.keys(get().sharing.decks).length) {
      await get().deleteAllShares().catch(console.error);
    }
  },
  async updateDeckProperties(deckId, properties) {
    const state = get();

    const deck = state.data.decks[deckId];
    assert(deck, `Deck ${deckId} does not exist.`);

    const nextDeck = {
      ...deck,
      ...properties,
    };

    nextDeck.date_update = new Date().toISOString();

    await state.updateShare(nextDeck);

    set((prev) => {
      const nextEdits = { ...prev.deckEdits };

      const edit = prev.deckEdits[deckId];

      if (edit) {
        if (properties.slots) {
          delete nextEdits[deckId];
        } else {
          const nextEdit = structuredClone(edit);
          if (properties.name) delete nextEdit.name;
          if (properties.tags) delete nextEdit.tags;
          nextEdits[deckId] = nextEdit;
        }
      }

      return {
        deckEdits: nextEdits,
        data: {
          ...prev.data,
          decks: {
            ...prev.data.decks,
            [nextDeck.id]: nextDeck,
          },
        },
      };
    });

    await dehydrate(get(), "app", "edits");

    return nextDeck;
  },
  async saveDeck(deckId) {
    const state = get();
    const metadata = selectMetadata(state);

    const edits = state.deckEdits[deckId];

    const deck = state.data.decks[deckId];
    if (!deck) return deckId;

    const nextDeck = applyDeckEdits(deck, edits, metadata, true, undefined);
    nextDeck.date_update = new Date().toISOString();

    const originalValidation = selectDeckValid(
      state,
      resolveDeck(
        {
          lookupTables: selectLookupTables(state),
          metadata,
          sharing: state.sharing,
        },
        selectLocaleSortingCollator(state),
        deck,
      ),
    );

    if (hasQuantityEdits(edits) && originalValidation.valid) {
      markDeckbuildingStateEvolved(nextDeck);
    }

    const resolved = resolveDeck(
      {
        lookupTables: selectLookupTables(state),
        metadata,
        sharing: state.sharing,
      },
      selectLocaleSortingCollator(state),
      nextDeck,
    );

    const validation = selectDeckValid(state, resolved);
    nextDeck.problem = mapValidationToProblem(validation);

    await state.updateShare(nextDeck);

    set((prev) => {
      const deckEdits = { ...prev.deckEdits };
      delete deckEdits[deckId];

      const undoHistory = { ...prev.data.undoHistory };

      const resolveState = {
        metadata: selectMetadata(state),
        lookupTables: selectLookupTables(state),
        sharing: state.sharing,
      };

      const undoEntry = {
        changes: getChangeRecord(
          resolveDeck(resolveState, selectLocaleSortingCollator(state), deck),
          resolveDeck(
            resolveState,
            selectLocaleSortingCollator(state),
            nextDeck,
          ),
          true,
        ),
        date_update: nextDeck.date_update,
      };

      return {
        deckEdits,
        data: {
          ...prev.data,
          decks: {
            ...prev.data.decks,
            [nextDeck.id]: nextDeck,
          },
          undoHistory: {
            ...undoHistory,
            [nextDeck.id]: [...(undoHistory[nextDeck.id] ?? []), undoEntry],
          },
        },
      };
    });

    await dehydrate(get(), "app", "edits");
    return nextDeck.id;
  },

  backup() {
    download(
      prepareBackup(get()),
      `earthborne-build-${new Date().toISOString()}.json`,
      "application/json",
    );
  },
  async restore(buffer) {
    set(await restoreBackup(get(), buffer));
    await dehydrate(get(), "app");
  },
  async dismissBanner(bannerId) {
    set((state) => {
      const banners = new Set(state.app.bannersDismissed);
      banners.add(bannerId);

      return {
        app: {
          ...state.app,
          bannersDismissed: Array.from(banners),
        },
      };
    });

    await dehydrate(get(), "app");
  },
});

// ER has no cycles — synthesise one per pack so selectors that iterate
// packsByCycle can look up metadata.cycles[packCode] without crashing.
function synthesiseCycles(metadata: Metadata) {
  for (const pack of Object.values(metadata.packs)) {
    metadata.cycles[pack.code] = {
      code: pack.code,
      name: pack.name,
      position: pack.position,
      real_name: pack.name,
      official: true,
    };
  }
}

function dataVersionKey(version: DataVersion) {
  return JSON.stringify({
    card_count: version.card_count,
    cards_updated_at: version.cards_updated_at,
    locale: version.locale,
    translation_updated_at: version.translation_updated_at,
    version: version.version ?? null,
  });
}

function mergeInitialState(
  initialState: StoreState,
  persistedState: Partial<StoreState> | undefined,
  overrides: Partial<StoreState> | undefined,
) {
  const merged = {
    ...initialState,
    ...persistedState,
    ...overrides,
    app: {
      ...persistedState?.app,
      ...overrides?.app,
      clientId:
        overrides?.app?.clientId || persistedState?.app?.clientId || randomId(),
    },
    settings: {
      ...initialState.settings,
      ...persistedState?.settings,
      ...overrides?.settings,
      lists: {
        ...initialState.settings.lists,
        ...persistedState?.settings?.lists,
        ...overrides?.settings?.lists,
      },
    },
  };

  if (!merged.app.starterDecksSeeded) {
    const starterDecks = buildStarterDecks();
    const decks = { ...merged.data.decks };
    const history = { ...merged.data.history };
    for (const deck of starterDecks) {
      decks[deck.id] = deck;
      history[deck.id] = [];
    }
    merged.app = { ...merged.app, starterDecksSeeded: true };
    merged.data = { ...merged.data, decks, history };
  }

  return merged;
}
