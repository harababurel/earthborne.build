import type { Deck } from "@earthborne-build/shared";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { getMockStore } from "@/test/get-mock-store";
import type { StoreState } from ".";

describe("data slice", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  describe("actions.deleteDeck", () => {
    const mockState = {
      data: {
        decks: {
          "1": { id: "1" } as unknown as Deck,
          "4": { id: "4" } as unknown as Deck,
        },
        history: {
          "1": [],
          "4": [],
        },
        folders: {},
        deckFolders: {},
      },
    };

    afterEach(async () => {
      store = await getMockStore();
    });

    it("removes a deck from state", async () => {
      store.setState(mockState);
      await store.getState().deleteDeck("4");

      const state = store.getState();
      expect(state.data.decks["4"]).toBeUndefined();
      expect(state.data.history["4"]).toBeUndefined();
      expect(state.data.decks["1"]).toBeDefined();
    });
  });

  describe("actions.duplicateDeck", () => {
    const mockState = {
      data: {
        decks: {
          "1": {
            id: "1",
          } as unknown as Deck,
        },
        history: {
          "1": [],
        },
        folders: {},
        deckFolders: {},
      },
    };

    afterEach(async () => {
      store = await getMockStore();
    });

    it("duplicates a deck", async () => {
      store.setState(mockState);
      const id = await store.getState().duplicateDeck("1");

      const state = store.getState();

      expect(state.data.decks[id]).toMatchObject({
        id,
      });

      expect(state.data.history[id]).toMatchObject([]);
    });
  });
});
