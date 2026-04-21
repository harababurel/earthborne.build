import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { getMockStore } from "@/test/get-mock-store";
import type { StoreState } from "../slices";
import { applyCardChanges } from "./card-edits";

describe("applyCardChanges", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  it("returns the card unchanged (ER has no taboo/customization system)", () => {
    const state = store.getState();
    const firstCard = Object.values(state.metadata.cards)[0];
    if (!firstCard) return;
    const result = applyCardChanges(firstCard, state.metadata, undefined);
    expect(result).toEqual(firstCard);
  });

  it("ignores customizations and returns card unchanged", () => {
    const state = store.getState();
    const firstCard = Object.values(state.metadata.cards)[0];
    if (!firstCard) return;
    const customizations = {
      [firstCard.code]: { 0: { index: 0, xp_spent: 1 } },
    };
    const result = applyCardChanges(
      firstCard,
      state.metadata,
      customizations as never,
    );
    expect(result).toEqual(firstCard);
  });
});
