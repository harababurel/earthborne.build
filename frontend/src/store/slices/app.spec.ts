import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildStarterDecks } from "@/store/lib/predefined-decks";
import { makeData, makeTestDeck } from "@/test/factories";
import { getMockStore } from "@/test/get-mock-store";

describe("app slice", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(() =>
      Promise.resolve(json({ status: "ok" })),
    ) as ReturnType<typeof vi.fn>;
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

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

  it("ignores deletion for a missing deck", async () => {
    const store = await getMockStore();
    const data = makeData({
      decks: { "deck-1": makeTestDeck({ id: "deck-1" }) },
      history: { "deck-1": [] },
    });

    store.setState({ data });

    await expect(
      store.getState().deleteDeck("missing"),
    ).resolves.toBeUndefined();
    expect(store.getState().data).toEqual(data);
  });

  it("clears pending edits and undo history when deleting all decks", async () => {
    const store = await getMockStore();

    store.setState({
      data: makeData({
        decks: { "deck-1": makeTestDeck({ id: "deck-1" }) },
        history: { "deck-1": [] },
        undoHistory: { "deck-1": [] },
      }),
      deckEdits: {
        "deck-1": { name: "Edited deck" },
      },
    });

    await store.getState().deleteAllDecks();

    expect(store.getState().deckEdits).toEqual({});
    expect(store.getState().data.undoHistory).toEqual({});
  });

  it("saves a shared deck locally when the share update fails", async () => {
    const store = await getMockStore();
    const deck = makeTestDeck({ id: "deck-1", name: "Original deck" });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchMock.mockResolvedValueOnce(json({ message: "Share failed" }, 500));

    store.setState({
      data: makeData({
        decks: { "deck-1": deck },
        history: { "deck-1": [] },
        undoHistory: {},
      }),
      deckEdits: {
        "deck-1": { name: "Renamed deck" },
      },
      sharing: {
        decks: { "deck-1": deck.date_update },
        listed: { "deck-1": true },
      },
    });

    await expect(store.getState().saveDeck("deck-1")).resolves.toBe("deck-1");

    const savedDeck = store.getState().data.decks["deck-1"];
    expect(savedDeck?.name).toBe("Renamed deck");
    expect(savedDeck?.date_update).not.toBe(deck.date_update);
    expect(store.getState().deckEdits["deck-1"]).toBeUndefined();
    expect(store.getState().sharing.decks["deck-1"]).toBe(deck.date_update);
    expect(store.getState().ui.shareUpdateFailure).toMatchObject({
      deckId: "deck-1",
      message: "Share failed",
    });
  });

  it("updates deck properties locally when the share update fails", async () => {
    const store = await getMockStore();
    const deck = makeTestDeck({ id: "deck-1", name: "Original deck" });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchMock.mockResolvedValueOnce(json({ message: "Share failed" }, 500));

    store.setState({
      data: makeData({
        decks: { "deck-1": deck },
        history: { "deck-1": [] },
      }),
      sharing: {
        decks: { "deck-1": deck.date_update },
        listed: { "deck-1": true },
      },
    });

    await expect(
      store.getState().updateDeckProperties("deck-1", { name: "Renamed deck" }),
    ).resolves.toMatchObject({ name: "Renamed deck" });

    const savedDeck = store.getState().data.decks["deck-1"];
    expect(savedDeck?.name).toBe("Renamed deck");
    expect(savedDeck?.date_update).not.toBe(deck.date_update);
    expect(store.getState().sharing.decks["deck-1"]).toBe(deck.date_update);
    expect(store.getState().ui.shareUpdateFailure).toMatchObject({
      deckId: "deck-1",
      message: "Share failed",
    });
  });

  it("marks a shared deck current after a successful save share update", async () => {
    const store = await getMockStore();
    const deck = makeTestDeck({ id: "deck-1", name: "Original deck" });

    store.setState({
      data: makeData({
        decks: { "deck-1": deck },
        history: { "deck-1": [] },
        undoHistory: {},
      }),
      deckEdits: {
        "deck-1": { name: "Renamed deck" },
      },
      sharing: {
        decks: { "deck-1": deck.date_update },
        listed: { "deck-1": true },
      },
    });

    await store.getState().saveDeck("deck-1");

    const savedDeck = store.getState().data.decks["deck-1"];
    expect(store.getState().sharing.decks["deck-1"]).toBe(
      savedDeck?.date_update,
    );
    expect(requestBody(fetchMock, 0)).toMatchObject({ listed: true });
  });
});

function requestBody(fetchMock: ReturnType<typeof vi.fn>, callIndex: number) {
  return JSON.parse(fetchMock.mock.calls[callIndex]?.[1]?.body?.toString());
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
