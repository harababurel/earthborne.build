import type { Id } from "@earthborne-build/shared";
import type { StoreState } from "../slices";
import type {
  CampaignSyncItemState,
  DeckSyncItemState,
  SyncStatus,
} from "../slices/sync.types";

export function updateDeckSyncSuccess(
  sync: StoreState["sync"],
  deckId: Id,
  version: string,
  lastSyncedAt: number,
): StoreState["sync"] {
  const items = updateDeckSyncItem(sync.decks.items, deckId, {
    version,
    status: "synced",
    lastSyncedAt,
    error: null,
    conflict: null,
  });

  return {
    ...sync,
    decks: {
      ...sync.decks,
      manifestVersion: null,
      status: getDecksSyncStatus(items),
      error: null,
      items,
    },
  };
}

export function updateCampaignSyncSuccess(
  sync: StoreState["sync"],
  campaignId: Id,
  version: string,
  lastSyncedAt: number,
): StoreState["sync"] {
  const items = updateCampaignSyncItem(sync.campaigns.items, campaignId, {
    version,
    status: "synced",
    lastSyncedAt,
    error: null,
    conflict: null,
  });

  return {
    ...sync,
    campaigns: {
      ...sync.campaigns,
      manifestVersion: null,
      status: getCampaignsSyncStatus(items),
      error: null,
      items,
    },
  };
}

function updateDeckSyncItem(
  items: StoreState["sync"]["decks"]["items"],
  deckId: Id,
  payload: Partial<DeckSyncItemState>,
): StoreState["sync"]["decks"]["items"] {
  const item = items[deckId] ?? getInitialDeckSyncItem();
  return {
    ...items,
    [deckId]: {
      ...item,
      ...payload,
    },
  };
}

function updateCampaignSyncItem(
  items: StoreState["sync"]["campaigns"]["items"],
  campaignId: Id,
  payload: Partial<CampaignSyncItemState>,
): StoreState["sync"]["campaigns"]["items"] {
  const item = items[campaignId] ?? getInitialCampaignSyncItem();
  return {
    ...items,
    [campaignId]: {
      ...item,
      ...payload,
    },
  };
}

const ITEM_SYNC_STATUS_PRIORITY: Record<SyncStatus, number> = {
  idle: 0,
  synced: 1,
  partial: 2,
  saving: 3,
  loading: 4,
  error: 5,
  conflict: 6,
};

function getDecksSyncStatus(
  items: StoreState["sync"]["decks"]["items"],
): SyncStatus {
  let status: SyncStatus = "synced";
  for (const item of Object.values(items)) {
    if (
      ITEM_SYNC_STATUS_PRIORITY[item.status] > ITEM_SYNC_STATUS_PRIORITY[status]
    ) {
      status = item.status;
    }
  }
  return status;
}

function getCampaignsSyncStatus(
  items: StoreState["sync"]["campaigns"]["items"],
): SyncStatus {
  let status: SyncStatus = "synced";
  for (const item of Object.values(items)) {
    if (
      ITEM_SYNC_STATUS_PRIORITY[item.status] > ITEM_SYNC_STATUS_PRIORITY[status]
    ) {
      status = item.status;
    }
  }
  return status;
}

function getInitialDeckSyncItem(): DeckSyncItemState {
  return {
    version: null,
    status: "idle",
    lastSyncedAt: null,
    error: null,
    conflict: null,
  };
}

function getInitialCampaignSyncItem(): CampaignSyncItemState {
  return {
    version: null,
    status: "idle",
    lastSyncedAt: null,
    error: null,
    conflict: null,
  };
}
