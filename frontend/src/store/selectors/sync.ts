import type { Id } from "@earthborne-build/shared";
import { createSelector } from "reselect";
import type { StoreState } from "../slices";

export const selectDeckHasConflict = createSelector(
  (_: StoreState, id: Id) => String(id),
  (state: StoreState) => state.sync.decks.items,
  (id, items) => items[id]?.status === "conflict",
);

export const selectCampaignHasConflict = createSelector(
  (_: StoreState, id: Id) => String(id),
  (state: StoreState) => state.sync.campaigns.items,
  (id, items) => items[id]?.status === "conflict",
);
