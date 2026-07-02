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
        campaigns: {},
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

    it("unlinks the deck from campaigns", async () => {
      store.setState(mockState);
      const campaignId = await store
        .getState()
        .createCampaign({ name: "Party", cycle_id: "core" });
      await store.getState().linkDeckToCampaign(campaignId, "1");
      await store.getState().linkDeckToCampaign(campaignId, "4");

      await store.getState().deleteDeck("4");

      expect(store.getState().data.campaigns[campaignId].deck_ids).toEqual([
        "1",
      ]);
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
        campaigns: {},
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
