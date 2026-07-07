import type { Id } from "@earthborne-build/shared";
import { createSelector } from "reselect";
import type { StoreState } from "../slices";
import type { SyncStatus } from "../slices/sync.types";

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

// Conflicts on items that no longer exist locally (deletion conflicts) have
// no item page to render a resolution panel on; the settings page lists them.
export const selectOrphanedConflicts = createSelector(
  (state: StoreState) => state.sync.decks.items,
  (state: StoreState) => state.sync.campaigns.items,
  (state: StoreState) => state.data.decks,
  (state: StoreState) => state.data.campaigns,
  (deckItems, campaignItems, decks, campaigns) => ({
    decks: Object.keys(deckItems).filter(
      (id) => deckItems[id].status === "conflict" && !decks[id],
    ),
    campaigns: Object.keys(campaignItems).filter(
      (id) => campaignItems[id].status === "conflict" && !campaigns[id],
    ),
  }),
);

const ACCOUNT_SYNC_STATUS_PRIORITY: Record<SyncStatus, number> = {
  idle: 0,
  synced: 0,
  loading: 1,
  saving: 1,
  partial: 2,
  error: 3,
  conflict: 4,
};

export const selectAccountSyncStatus = (state: StoreState): SyncStatus => {
  const settings = state.sync.settings.status;
  const decks = state.sync.decks.status;
  const campaigns = state.sync.campaigns.status;
  const folders = state.sync.folders.status;
  const achievements = state.sync.achievements.status;

  return [settings, decks, campaigns, folders, achievements].reduce(
    (current, next) =>
      ACCOUNT_SYNC_STATUS_PRIORITY[next] > ACCOUNT_SYNC_STATUS_PRIORITY[current]
        ? next
        : current,
  );
};
