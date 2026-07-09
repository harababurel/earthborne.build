import { type Deck, isDeck } from "@earthborne-build/shared";
import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import { formatDeckImport, formatDeckShare } from "../lib/deck-io";
import { dehydrate } from "../persist";
import { selectClientId } from "../selectors/shared";
import { createShare, deleteShare, updateShare } from "../services/queries";
import { ApiError } from "../services/requests/shared";
import type { StoreState } from ".";
import type { SharingSlice } from "./sharing.types";

function getInitialSharingState() {
  return {
    decks: {},
    listed: {},
  };
}

export const createSharingSlice: StateCreator<
  StoreState,
  [],
  [],
  SharingSlice
> = (set, get) => ({
  sharing: getInitialSharingState(),

  async createShare(id, listed = false) {
    const state = get();

    assert(!state.sharing.decks[id], `Deck with id ${id} is already shared.`);

    const deck = state.data.decks[id];
    assert(deck, `Deck with id ${id} not found.`);

    await createShare(selectClientId(state), formatDeckShare(deck), [], listed);

    set((prev) => ({
      sharing: {
        ...prev.sharing,
        decks: {
          ...prev.sharing.decks,
          [id]: deck.date_update,
        },
        listed: {
          ...prev.sharing.listed,
          [id]: listed,
        },
      },
    }));

    await dehydrate(get(), "app");
  },

  async updateShare(deck) {
    const state = get();

    if (!state.sharing.decks[deck.id]) return;

    await updateShare(
      selectClientId(state),
      deck.id.toString(),
      formatDeckShare(deck),
      [],
      state.sharing.listed[deck.id] ?? false,
    );

    set((prev) => ({
      sharing: {
        ...prev.sharing,
        decks: {
          ...prev.sharing.decks,
          [deck.id]: deck.date_update,
        },
      },
    }));

    await dehydrate(get(), "app");

    return deck.id;
  },

  async deleteShare(id) {
    const state = get();

    if (!state.sharing.decks[id]) return;

    try {
      await deleteShare(selectClientId(state), id);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) {
        throw error;
      }
    }

    set((prev) => {
      const decks = { ...prev.sharing.decks };
      const listed = { ...prev.sharing.listed };
      delete decks[id];
      delete listed[id];
      return {
        sharing: {
          ...prev.sharing,
          decks,
          listed,
        },
      };
    });

    await dehydrate(get(), "app");
  },

  async deleteAllShares() {
    const state = get();

    // TODO: surface this error.
    await Promise.all(
      Object.keys(state.sharing.decks).map((id) =>
        deleteShare(selectClientId(state), id),
      ),
    ).catch(console.error);

    set({
      sharing: {
        decks: {},
        listed: {},
      },
    });

    await dehydrate(get(), "app");
  },

  async setShareListed(id, listed) {
    const state = get();

    assert(state.sharing.decks[id], `Deck with id ${id} is not shared.`);

    const deck = state.data.decks[id];
    assert(deck, `Deck with id ${id} not found.`);

    await updateShare(
      selectClientId(state),
      id,
      formatDeckShare(deck),
      [],
      listed,
    );

    set((prev) => ({
      sharing: {
        ...prev.sharing,
        decks: {
          ...prev.sharing.decks,
          [id]: deck.date_update,
        },
        listed: {
          ...prev.sharing.listed,
          [id]: listed,
        },
      },
    }));

    await dehydrate(get(), "app");
  },
  async importSharedDeck(importDeck, type) {
    const state = get();

    assert(
      !state.data.decks[importDeck.id],
      `Deck with id ${importDeck.id} already exists.`,
    );

    const deck = formatDeckImport(state, importDeck as Deck, type);
    assert(isDeck(deck), "Invalid deck data.");

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
    }));

    await dehydrate(get(), "app");

    return deck.id;
  },
});
