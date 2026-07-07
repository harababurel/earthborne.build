import type { Deck, Id } from "@earthborne-build/shared";
import { isCampaignConflictError } from "../services/requests/campaigns";
import { isDeckConflictError } from "../services/requests/decks";
import type { StoreState } from "../slices";
import type {
  CampaignSyncItemState,
  DeckSyncItemState,
  SyncStatus,
} from "../slices/sync.types";

// The starter decks are seeded into every fresh browser with device-local ids.
// Mirroring them to the account would add another five copies per device, so
// they stay local until the user actually modifies one.
export function isUnmodifiedStarterDeck(deck: Deck): boolean {
  return (
    deck.source == null &&
    deck.tags?.includes("premade") === true &&
    deck.date_update === deck.date_creation
  );
}

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

export function updateDeckSyncSaving(
  sync: StoreState["sync"],
  deckId: Id,
): StoreState["sync"] {
  const items = updateDeckSyncItem(sync.decks.items, deckId, {
    status: "saving",
    error: null,
    conflict: null,
  });

  return {
    ...sync,
    decks: {
      ...sync.decks,
      status: getDecksSyncStatus(items),
      items,
    },
  };
}

export function updateCampaignSyncSaving(
  sync: StoreState["sync"],
  campaignId: Id,
): StoreState["sync"] {
  const items = updateCampaignSyncItem(sync.campaigns.items, campaignId, {
    status: "saving",
    error: null,
    conflict: null,
  });

  return {
    ...sync,
    campaigns: {
      ...sync.campaigns,
      status: getCampaignsSyncStatus(items),
      items,
    },
  };
}

export function replaceDeckSyncItems(
  sync: StoreState["sync"],
  items: StoreState["sync"]["decks"]["items"],
): StoreState["sync"] {
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

export function replaceCampaignSyncItems(
  sync: StoreState["sync"],
  items: StoreState["sync"]["campaigns"]["items"],
): StoreState["sync"] {
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

export function updateDeckSyncError(
  sync: StoreState["sync"],
  deckId: Id,
  error: unknown,
  kind: NonNullable<DeckSyncItemState["conflict"]>["kind"],
): StoreState["sync"] {
  if (isDeckConflictError(error)) {
    const remoteVersion = error.remote?.revision ?? null;
    const items = updateDeckSyncItem(sync.decks.items, deckId, {
      status: "conflict",
      error: null,
      conflict: {
        kind,
        remoteVersion,
      },
    });

    return {
      ...sync,
      decks: {
        ...sync.decks,
        status: getDecksSyncStatus(items),
        items,
      },
    };
  }

  const items = updateDeckSyncItem(sync.decks.items, deckId, {
    status: "error",
    error: error instanceof Error ? error.message : "Unknown error",
  });

  return {
    ...sync,
    decks: {
      ...sync.decks,
      status: getDecksSyncStatus(items),
      items,
    },
  };
}

export function updateCampaignSyncError(
  sync: StoreState["sync"],
  campaignId: Id,
  error: unknown,
  kind: NonNullable<CampaignSyncItemState["conflict"]>["kind"],
): StoreState["sync"] {
  if (isCampaignConflictError(error)) {
    const remoteVersion = error.remote?.revision ?? null;
    const items = updateCampaignSyncItem(sync.campaigns.items, campaignId, {
      status: "conflict",
      error: null,
      conflict: {
        kind,
        remoteVersion,
      },
    });

    return {
      ...sync,
      campaigns: {
        ...sync.campaigns,
        status: getCampaignsSyncStatus(items),
        items,
      },
    };
  }

  const items = updateCampaignSyncItem(sync.campaigns.items, campaignId, {
    status: "error",
    error: error instanceof Error ? error.message : "Unknown error",
  });

  return {
    ...sync,
    campaigns: {
      ...sync.campaigns,
      status: getCampaignsSyncStatus(items),
      items,
    },
  };
}

export function updateDeckSyncConflictError(
  sync: StoreState["sync"],
  deckId: Id,
  error: unknown,
  kind: NonNullable<DeckSyncItemState["conflict"]>["kind"],
): StoreState["sync"] {
  const current = sync.decks.items[deckId] ?? getInitialDeckSyncItem();

  if (isDeckConflictError(error)) {
    return updateDeckSyncError(sync, deckId, error, kind);
  }

  const items = updateDeckSyncItem(sync.decks.items, deckId, {
    ...current,
    status: "conflict",
    error: error instanceof Error ? error.message : "Unknown error",
    conflict: current.conflict ?? { kind, remoteVersion: null },
  });

  return {
    ...sync,
    decks: {
      ...sync.decks,
      status: getDecksSyncStatus(items),
      items,
    },
  };
}

export function updateCampaignSyncConflictError(
  sync: StoreState["sync"],
  campaignId: Id,
  error: unknown,
  kind: NonNullable<CampaignSyncItemState["conflict"]>["kind"],
): StoreState["sync"] {
  const current =
    sync.campaigns.items[campaignId] ?? getInitialCampaignSyncItem();

  if (isCampaignConflictError(error)) {
    return updateCampaignSyncError(sync, campaignId, error, kind);
  }

  const items = updateCampaignSyncItem(sync.campaigns.items, campaignId, {
    ...current,
    status: "conflict",
    error: error instanceof Error ? error.message : "Unknown error",
    conflict: current.conflict ?? { kind, remoteVersion: null },
  });

  return {
    ...sync,
    campaigns: {
      ...sync.campaigns,
      status: getCampaignsSyncStatus(items),
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
