import { describe, expect, it } from "vitest";
import { buildStarterDecks } from "@/store/lib/predefined-decks";
import { getMockStore } from "@/test/get-mock-store";

describe("app slice", () => {
  it("re-adds only missing or modified premade decks", async () => {
    const store = await getMockStore();

    store.setState({
      app: {
        ...store.getState().app,
        starterDecksSeeded: true,
      },
      data: {
        decks: {},
        history: {},
        campaigns: {},
        folders: {},
        deckFolders: {},
      },
    });

    await expect(store.getState().addStarterDecks()).resolves.toBe(5);
    await expect(store.getState().addStarterDecks()).resolves.toBe(0);

    const starterDeckNames = buildStarterDecks().map((deck) => deck.name);
    const [modifiedName, deletedName] = starterDeckNames;
    const currentDecks = Object.values(store.getState().data.decks);
    const modifiedDeck = currentDecks.find(
      (deck) => deck.name === modifiedName,
    );
    const deletedDeck = currentDecks.find((deck) => deck.name === deletedName);

    expect(modifiedDeck).toBeDefined();
    expect(deletedDeck).toBeDefined();

    store.setState((state) => {
      const decks = { ...state.data.decks };
      const history = { ...state.data.history };

      if (modifiedDeck) {
        decks[modifiedDeck.id] = {
          ...modifiedDeck,
          name: `${modifiedDeck.name} edited`,
        };
      }

      if (deletedDeck) {
        delete decks[deletedDeck.id];
        delete history[deletedDeck.id];
      }

      return {
        data: {
          ...state.data,
          decks,
          history,
        },
      };
    });

    await expect(store.getState().addStarterDecks()).resolves.toBe(2);

    const finalDecks = Object.values(store.getState().data.decks);
    for (const name of starterDeckNames) {
      expect(finalDecks.some((deck) => deck.name === name)).toBe(true);
    }
    expect(
      finalDecks.some((deck) => deck.name === `${modifiedName} edited`),
    ).toBe(true);
  });
});
