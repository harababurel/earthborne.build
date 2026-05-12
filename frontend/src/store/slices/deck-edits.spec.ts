import { DeckSchema } from "@earthborne-build/shared";
import deckExtraSlots from "@test/fixtures/decks/extra_slots.json";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { getMockStore } from "@/test/get-mock-store";
import { selectResolvedDeckById } from "../selectors/decks";
import type { StoreState } from ".";

describe("deck-view slice", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  describe("updateCardQuantity", () => {
    beforeEach(() => {
      store.setState({
        deckEdits: {},
        data: {
          decks: {
            "deck-id": DeckSchema.parse({
              ...deckExtraSlots,
              aspect_code: "awareness",
              role_code: "10001",
              background: "artisan",
              specialty: "forager",
            }),
          },
          history: {
            "deck-id": [],
          },
          folders: {},
          deckFolders: {},
        },
      });
    });

    it("increments the quantity of a card", () => {
      const state = store.getState();
      state.updateCardQuantity("deck-id", "01000", 1, 2, "slots", "increment");
      expect(
        selectResolvedDeckById(store.getState(), "deck-id", true)?.slots[
          "01000"
        ],
      ).toEqual(2);
    });

    it("decrements the quantity of a card", () => {
      const state = store.getState();

      state.updateCardQuantity("deck-id", "01000", -1, 2, "slots", "increment");

      const resolved = selectResolvedDeckById(
        store.getState(),
        "deck-id",
        true,
      );

      expect(resolved?.slots["01000"]).toEqual(0);
    });

    it("adds a removed card copy to displaced cards", () => {
      const state = store.getState();

      state.updateCardQuantity("deck-id", "03037", -1, 2, "slots", "increment");

      const resolved = selectResolvedDeckById(
        store.getState(),
        "deck-id",
        true,
      );

      expect(resolved?.slots["03037"]).toEqual(1);
      expect(resolved?.displaced?.["03037"]).toEqual(1);
    });

    it("adds all removed card copies to displaced cards", () => {
      const state = store.getState();

      state.updateCardQuantity("deck-id", "03037", 0, 2, "slots", "set");

      const resolved = selectResolvedDeckById(
        store.getState(),
        "deck-id",
        true,
      );

      expect(resolved?.slots["03037"]).toEqual(0);
      expect(resolved?.displaced?.["03037"]).toEqual(2);
    });

    it("restores one displaced card copy to the deck", () => {
      const state = store.getState();

      state.updateCardQuantity("deck-id", "03037", 0, 2, "slots", "set");
      state.restoreDisplaced("deck-id", "03037", undefined, 1);

      const resolved = selectResolvedDeckById(
        store.getState(),
        "deck-id",
        true,
      );

      expect(resolved?.slots["03037"]).toEqual(1);
      expect(resolved?.displaced?.["03037"]).toEqual(1);
    });

    it("removes a displaced card without restoring it to the deck", () => {
      const state = store.getState();

      state.updateCardQuantity("deck-id", "03037", 0, 2, "slots", "set");
      state.removeDisplaced("deck-id", "03037");

      const resolved = selectResolvedDeckById(
        store.getState(),
        "deck-id",
        true,
      );

      expect(resolved?.slots["03037"]).toEqual(0);
      expect(resolved?.displaced?.["03037"]).toEqual(0);
    });

    it("sets the quantity of a card", () => {
      const state = store.getState();
      state.updateCardQuantity("deck-id", "01000", 5, 5, "slots", "set");
      expect(
        selectResolvedDeckById(store.getState(), "deck-id", true)?.slots[
          "01000"
        ],
      ).toEqual(5);
    });

    it("does not set the quantity of a card to a negative value", () => {
      const state = store.getState();
      state.updateCardQuantity("deck-id", "01000", -5, 5, "slots", "set");
      state.updateCardQuantity("deck-id", "01000", -5, 5, "slots", "increment");
      expect(
        selectResolvedDeckById(store.getState(), "deck-id", true)?.slots[
          "01000"
        ],
      ).toEqual(0);
    });

    it("does not set the quantity of a card exceeding the limit", () => {
      const state = store.getState();
      state.updateCardQuantity("deck-id", "06021", 5, 3, "slots", "set");
      state.updateCardQuantity("deck-id", "06021", 5, 3, "slots", "increment");
      expect(
        selectResolvedDeckById(store.getState(), "deck-id", true)?.slots[
          "06021"
        ],
      ).toEqual(3);
    });
  });
});
