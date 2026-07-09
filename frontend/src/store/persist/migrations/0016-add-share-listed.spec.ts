import { describe, expect, it } from "vitest";
import type { StoreState } from "@/store/slices";
import migrate from "./0016-add-share-listed";

function makeState(sharing: Partial<StoreState["sharing"]>): StoreState {
  return { sharing } as unknown as StoreState;
}

describe("0016-add-share-listed", () => {
  it("marks pre-existing shares as listed, matching the server backfill", () => {
    const state = makeState({
      decks: {
        "deck-1": "2026-01-01T00:00:00.000Z",
        "deck-2": "2026-02-01T00:00:00.000Z",
      },
    });

    migrate(state, 16);

    expect(state.sharing.listed).toEqual({
      "deck-1": true,
      "deck-2": true,
    });
  });

  it("initializes an empty listed map when there are no shares", () => {
    const state = makeState({ decks: {} });

    migrate(state, 16);

    expect(state.sharing.listed).toEqual({});
  });

  it("does nothing for already-migrated stores", () => {
    const state = makeState({
      decks: { "deck-1": "2026-01-01T00:00:00.000Z" },
      listed: { "deck-1": false },
    });

    migrate(state, 17);

    expect(state.sharing.listed).toEqual({ "deck-1": false });
  });

  it("keeps an existing listed map intact", () => {
    const state = makeState({
      decks: { "deck-1": "2026-01-01T00:00:00.000Z" },
      listed: { "deck-1": false },
    });

    migrate(state, 16);

    expect(state.sharing.listed).toEqual({ "deck-1": false });
  });
});
