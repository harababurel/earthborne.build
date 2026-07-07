import type { Id, SyncedCampaign, SyncedDeck } from "@earthborne-build/shared";
import type { StoreState } from "../slices";
import type {
  CampaignSyncItemState,
  CampaignsSyncState,
  DeckSyncItemState,
  DecksSyncState,
  SyncStatus,
} from "../slices/sync.types";

const SKIPPED_ITEM_STATUSES = new Set<SyncStatus>(["saving", "conflict"]);

export type ReconciliationItemInput = {
  id: Id;
  date_update: string;
};

export type ReconciliationSyncItem = {
  version: string | null;
  status: SyncStatus;
  lastSyncedAt: number | null;
};

export type ReconciliationManifestItem = {
  id: string;
  revision: string;
};

export type ReconciliationItemPlan = {
  downloads: string[];
  uploads: string[];
  pushes: string[];
  localDeletions: string[];
  remoteDeletions: string[];
  conflicts: Array<{
    id: string;
    remoteVersion: string;
    kind: "update" | "delete";
  }>;
};

export function reconcileItems(
  local: Record<string, ReconciliationItemInput>,
  syncItems: Record<string, ReconciliationSyncItem>,
  manifest: ReconciliationManifestItem[],
): ReconciliationItemPlan {
  const downloads: string[] = [];
  const uploads: string[] = [];
  const pushes: string[] = [];
  const localDeletions: string[] = [];
  const remoteDeletions: string[] = [];
  const conflicts: ReconciliationItemPlan["conflicts"] = [];

  const manifestMap = new Map(manifest.map((m) => [m.id, m.revision]));
  const manifestIds = new Set(manifestMap.keys());
  const localIds = new Set(Object.keys(local));

  // 1. Process manifest items (remote)
  for (const [id, remoteRevision] of manifestMap.entries()) {
    const localItem = local[id];
    const syncItem = syncItems[id];

    if (shouldSkipSyncItem(syncItem)) {
      continue;
    }

    if (localItem) {
      if (syncItem) {
        const isDirty =
          new Date(localItem.date_update).getTime() >
          (syncItem.lastSyncedAt ?? 0);
        if (remoteRevision === syncItem.version) {
          if (isDirty) {
            pushes.push(id);
          }
        } else {
          if (isDirty) {
            conflicts.push({
              id,
              remoteVersion: remoteRevision,
              kind: "update",
            });
          } else {
            downloads.push(id);
          }
        }
      } else {
        // ID collision
        conflicts.push({ id, remoteVersion: remoteRevision, kind: "update" });
      }
    } else {
      if (syncItem) {
        // Synced before but deleted locally -> delete remotely
        remoteDeletions.push(id);
      } else {
        // Never synced, missing locally -> download
        downloads.push(id);
      }
    }
  }

  // 2. Process local items not in manifest
  for (const id of localIds) {
    if (manifestIds.has(id)) continue;

    const syncItem = syncItems[id];
    if (shouldSkipSyncItem(syncItem)) {
      continue;
    }

    if (syncItem) {
      // Synced before but missing from server -> deleted on another device
      localDeletions.push(id);
    } else {
      // Never synced -> upload
      uploads.push(id);
    }
  }

  return {
    downloads,
    uploads,
    pushes,
    localDeletions,
    remoteDeletions,
    conflicts,
  };
}

type DeckReconciliationInput = {
  accountId: string;
  dataDecks: StoreState["data"]["decks"];
  deckFolders: StoreState["data"]["deckFolders"];
  history: StoreState["data"]["history"];
  undoHistory: StoreState["data"]["undoHistory"];
  deckEdits: StoreState["deckEdits"];
  manifestDecks: ReconciliationManifestItem[];
  plan: ReconciliationItemPlan;
  remoteDecks: SyncedDeck[];
  syncDecks: DecksSyncState;
};

type DeckReconciliationResult = {
  decks: StoreState["data"]["decks"];
  deckFolders: StoreState["data"]["deckFolders"];
  history: StoreState["data"]["history"];
  undoHistory: StoreState["data"]["undoHistory"];
  deckEdits: StoreState["deckEdits"];
  syncDecks: DecksSyncState;
};

export function applyRemoteDeckReconciliation({
  accountId,
  dataDecks,
  deckFolders,
  history,
  undoHistory,
  deckEdits,
  manifestDecks,
  plan,
  remoteDecks,
  syncDecks,
}: DeckReconciliationInput): DeckReconciliationResult {
  const now = Date.now();
  const skippedIdKeys = new Set<string>();
  // Items awaiting a push keep their current version + lastSyncedAt: stamping
  // them as synced here would erase the dirtiness that drives the push retry.
  const pushIdKeys = new Set(plan.pushes);

  const nextDecks = { ...dataDecks };
  const nextDeckFolders = { ...deckFolders };
  const nextDeckEdits = { ...deckEdits };
  const nextItems = { ...syncDecks.items };
  const nextHistory = { ...history };
  const nextUndoHistory = undoHistory ? { ...undoHistory } : {};

  // 1. Process deletions
  for (const id of plan.localDeletions) {
    const syncItem = nextItems[id];
    if (shouldSkipSyncItem(syncItem)) {
      skippedIdKeys.add(id);
      continue;
    }
    delete nextDecks[id];
    delete nextItems[id];
    delete nextDeckEdits[id];
    delete nextDeckFolders[id];
    delete nextHistory[id];
    delete nextUndoHistory[id];
  }

  // 2. Process downloads
  for (const syncedDeck of remoteDecks) {
    const deck = syncedDeck.data;
    const id = String(deck.id);
    const syncItem = nextItems[id];

    if (shouldSkipSyncItem(syncItem)) {
      skippedIdKeys.add(id);
      continue;
    }

    nextDecks[id] = { ...deck, source: "account" };
    nextItems[id] = makeSyncedItem(syncedDeck.revision, now, syncItem);
    // The deck collection lists decks keyed by `data.history` — a deck
    // without a history entry is invisible.
    nextHistory[id] ??= [];
    delete nextUndoHistory[id];
  }

  // 3. Surface conflicts so the user can resolve them
  for (const conflict of plan.conflicts) {
    const syncItem = nextItems[conflict.id];
    skippedIdKeys.add(conflict.id);
    if (shouldSkipSyncItem(syncItem)) continue;
    nextItems[conflict.id] = makeConflictItem(conflict, syncItem);
  }

  // 4. Update version metadata for items that were already up to date on server
  const referencedIdKeys = new Set(
    Object.values(nextHistory).flat().map(String),
  );

  for (const item of manifestDecks) {
    const id = item.id;
    if (skippedIdKeys.has(id) || pushIdKeys.has(id)) continue;

    const syncItem = nextItems[id];
    if (shouldSkipSyncItem(syncItem)) {
      skippedIdKeys.add(id);
      continue;
    }

    if (!nextDecks[id]) continue;
    nextItems[id] = makeSyncedItem(item.revision, now, syncItem);

    // Heal synced decks that are missing their collection-index entry, but
    // leave previous versions referenced from another deck's history alone.
    if (!referencedIdKeys.has(id)) {
      nextHistory[id] ??= [];
    }
  }

  return {
    decks: nextDecks,
    deckFolders: nextDeckFolders,
    history: nextHistory,
    undoHistory: nextUndoHistory,
    deckEdits: nextDeckEdits,
    syncDecks: {
      ...syncDecks,
      accountId,
      manifestVersion: null,
      lastSyncedAt: now,
      status: getReconciliationStatus(skippedIdKeys, nextItems),
      error: null,
      items: nextItems,
    },
  };
}

type CampaignReconciliationInput = {
  accountId: string;
  dataCampaigns: StoreState["data"]["campaigns"];
  undoHistory: StoreState["data"]["undoHistory"];
  manifestCampaigns: ReconciliationManifestItem[];
  plan: ReconciliationItemPlan;
  remoteCampaigns: SyncedCampaign[];
  syncCampaigns: CampaignsSyncState;
};

type CampaignReconciliationResult = {
  campaigns: StoreState["data"]["campaigns"];
  undoHistory: StoreState["data"]["undoHistory"];
  syncCampaigns: CampaignsSyncState;
};

export function applyRemoteCampaignReconciliation({
  accountId,
  dataCampaigns,
  undoHistory,
  manifestCampaigns,
  plan,
  remoteCampaigns,
  syncCampaigns,
}: CampaignReconciliationInput): CampaignReconciliationResult {
  const now = Date.now();
  const skippedIdKeys = new Set<string>();
  const pushIdKeys = new Set(plan.pushes);

  const nextCampaigns = { ...dataCampaigns };
  const nextItems = { ...syncCampaigns.items };
  const nextUndoHistory = undoHistory ? { ...undoHistory } : {};

  // 1. Process deletions
  for (const id of plan.localDeletions) {
    const syncItem = nextItems[id];
    if (shouldSkipSyncItem(syncItem)) {
      skippedIdKeys.add(id);
      continue;
    }
    delete nextCampaigns[id];
    delete nextItems[id];
    delete nextUndoHistory[id];
  }

  // 2. Process downloads
  for (const syncedCampaign of remoteCampaigns) {
    const campaign = syncedCampaign.data;
    const id = String(campaign.id);
    const syncItem = nextItems[id];

    if (shouldSkipSyncItem(syncItem)) {
      skippedIdKeys.add(id);
      continue;
    }

    nextCampaigns[id] = campaign;
    nextItems[id] = makeSyncedItem(syncedCampaign.revision, now, syncItem);
    delete nextUndoHistory[id];
  }

  // 3. Surface conflicts so the user can resolve them
  for (const conflict of plan.conflicts) {
    const syncItem = nextItems[conflict.id];
    skippedIdKeys.add(conflict.id);
    if (shouldSkipSyncItem(syncItem)) continue;
    nextItems[conflict.id] = makeConflictItem(conflict, syncItem);
  }

  // 4. Update version metadata for items that were already up to date on server
  for (const item of manifestCampaigns) {
    const id = item.id;
    if (skippedIdKeys.has(id) || pushIdKeys.has(id)) continue;

    const syncItem = nextItems[id];
    if (shouldSkipSyncItem(syncItem)) {
      skippedIdKeys.add(id);
      continue;
    }

    if (!nextCampaigns[id]) continue;
    nextItems[id] = makeSyncedItem(item.revision, now, syncItem);
  }

  return {
    campaigns: nextCampaigns,
    undoHistory: nextUndoHistory,
    syncCampaigns: {
      ...syncCampaigns,
      accountId,
      manifestVersion: null,
      lastSyncedAt: now,
      status: getReconciliationStatus(skippedIdKeys, nextItems),
      error: null,
      items: nextItems,
    },
  };
}

export function hasUnsettledSyncItems(
  syncDecks: DecksSyncState,
  syncCampaigns: CampaignsSyncState,
): boolean {
  return (
    Object.values(syncDecks.items).some(shouldSkipSyncItem) ||
    Object.values(syncCampaigns.items).some(shouldSkipSyncItem)
  );
}

function makeSyncedItem(
  version: string,
  lastSyncedAt: number,
  item: DeckSyncItemState | CampaignSyncItemState | undefined,
): DeckSyncItemState & CampaignSyncItemState {
  return {
    ...item,
    version,
    status: "synced",
    lastSyncedAt,
    error: null,
    conflict: null,
  };
}

function makeConflictItem(
  conflict: ReconciliationItemPlan["conflicts"][number],
  item: DeckSyncItemState | CampaignSyncItemState | undefined,
): DeckSyncItemState & CampaignSyncItemState {
  // The current version + lastSyncedAt are kept: they still describe the last
  // state both sides agreed on, which resolution needs to reason about.
  return {
    version: item?.version ?? null,
    lastSyncedAt: item?.lastSyncedAt ?? null,
    status: "conflict",
    error: null,
    conflict: {
      kind: conflict.kind,
      remoteVersion: conflict.remoteVersion,
    },
  };
}

function getReconciliationStatus(
  skippedIdKeys: Set<string>,
  items: Record<string, DeckSyncItemState | CampaignSyncItemState>,
): SyncStatus {
  if (!skippedIdKeys.size) return "synced";

  for (const id of skippedIdKeys) {
    if (items[id]?.status === "conflict") return "conflict";
  }

  return "partial";
}

function shouldSkipSyncItem(item: ReconciliationSyncItem | undefined): boolean {
  return item ? SKIPPED_ITEM_STATUSES.has(item.status) : false;
}
