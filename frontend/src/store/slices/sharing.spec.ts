import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeData, makeTestDeck } from "@/test/factories";
import { getMockStore } from "@/test/get-mock-store";

describe("sharing slice", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(() => Promise.resolve(json({ status: "ok" })));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("treats deleting an already-missing remote share as success", async () => {
    const store = await getMockStore();

    store.setState({
      data: makeData({
        decks: { "deck-1": makeTestDeck({ id: "deck-1" }) },
      }),
      sharing: {
        decks: { "deck-1": "2026-01-01T00:00:00.000Z" },
        listed: { "deck-1": true },
      },
    });
    fetchMock.mockResolvedValueOnce(
      json({ message: "Shared deck not found" }, 404),
    );

    await expect(
      store.getState().deleteShare("deck-1"),
    ).resolves.toBeUndefined();

    expect(store.getState().sharing.decks["deck-1"]).toBeUndefined();
    expect(store.getState().sharing.listed["deck-1"]).toBeUndefined();
  });

  it("keeps other share delete failures fatal", async () => {
    const store = await getMockStore();

    store.setState({
      data: makeData({
        decks: { "deck-1": makeTestDeck({ id: "deck-1" }) },
      }),
      sharing: {
        decks: { "deck-1": "2026-01-01T00:00:00.000Z" },
        listed: { "deck-1": true },
      },
    });
    fetchMock.mockResolvedValueOnce(
      json({ message: "Share delete failed" }, 500),
    );

    await expect(store.getState().deleteShare("deck-1")).rejects.toThrow(
      "Share delete failed",
    );

    expect(store.getState().sharing.decks["deck-1"]).toBe(
      "2026-01-01T00:00:00.000Z",
    );
    expect(store.getState().sharing.listed["deck-1"]).toBe(true);
  });

  it("creates an unlisted share by default", async () => {
    const store = await getMockStore();
    const deck = makeTestDeck({ id: "deck-1" });

    store.setState({
      data: makeData({
        decks: { "deck-1": deck },
      }),
    });

    await store.getState().createShare("deck-1");

    expect(requestBody(fetchMock, 0)).toMatchObject({ listed: false });
    expect(store.getState().sharing.decks["deck-1"]).toBe(deck.date_update);
    expect(store.getState().sharing.listed["deck-1"]).toBe(false);
  });

  it("updates a share listing flag", async () => {
    const store = await getMockStore();
    const deck = makeTestDeck({ id: "deck-1" });

    store.setState({
      data: makeData({
        decks: { "deck-1": deck },
      }),
      sharing: {
        decks: { "deck-1": deck.date_update },
        listed: { "deck-1": false },
      },
    });

    await store.getState().setShareListed("deck-1", true);

    expect(requestBody(fetchMock, 0)).toMatchObject({ listed: true });
    expect(store.getState().sharing.listed["deck-1"]).toBe(true);
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
