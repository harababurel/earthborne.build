import type { FolderState } from "@earthborne-build/shared";
import type { StateCreator } from "zustand";
import { ARCHIVE_FOLDER_ID } from "@/utils/constants";
import type { AuthState } from "./auth.types";
import type { StoreState } from "./index";
import type {
  AchievementsSyncState,
  CampaignSyncItemState,
  CampaignsSyncState,
  DeckSyncItemState,
  DecksSyncState,
  FoldersSyncState,
  SettingsSyncState,
  SyncSlice,
  SyncState,
} from "./sync.types";

function getInitialSettingsSyncState(): SettingsSyncState {
  return {
    accountId: null,
    revision: null,
    lastSyncedAt: null,
    status: "idle",
    error: null,
    conflict: null,
  };
}

function getInitialDeckSyncItemState(): DeckSyncItemState {
  return {
    version: null,
    status: "idle",
    lastSyncedAt: null,
    error: null,
    conflict: null,
  };
}

function getInitialDecksSyncState(): DecksSyncState {
  return {
    accountId: null,
    manifestVersion: null,
    lastSyncedAt: null,
    status: "idle",
    error: null,
    items: {},
  };
}

function getInitialCampaignSyncItemState(): CampaignSyncItemState {
  return {
    version: null,
    status: "idle",
    lastSyncedAt: null,
    error: null,
    conflict: null,
  };
}

function getInitialCampaignsSyncState(): CampaignsSyncState {
  return {
    accountId: null,
    manifestVersion: null,
    lastSyncedAt: null,
    status: "idle",
    error: null,
    items: {},
  };
}

function getInitialFoldersSyncState(): FoldersSyncState {
  return {
    accountId: null,
    revision: null,
    lastSyncedAt: null,
    status: "idle",
    error: null,
    conflict: null,
  };
}

function getInitialAchievementsSyncState(): AchievementsSyncState {
  return {
    accountId: null,
    revision: null,
    lastSyncedAt: null,
    status: "idle",
    error: null,
    conflict: null,
  };
}

function getInitialSyncState(): SyncState {
  return {
    sync: {
      settings: getInitialSettingsSyncState(),
      decks: getInitialDecksSyncState(),
      campaigns: getInitialCampaignsSyncState(),
      folders: getInitialFoldersSyncState(),
      achievements: getInitialAchievementsSyncState(),
    },
  };
}

export const createSyncSlice: StateCreator<StoreState, [], [], SyncSlice> = (
  set,
  _get,
) => ({
  ...getInitialSyncState(),

  bootstrapAuthenticatedState(_client) {
    // Implemented in Phase 8
    return Promise.resolve();
  },

  clearAccountState(auth?: AuthState) {
    set((state) => ({
      ...removeRemoteAccountData(state),
      ...(auth ? { auth } : {}),
      sync: getInitialSyncState().sync,
    }));
  },

  setSettingsSync(payload) {
    set((state) => ({
      sync: {
        ...state.sync,
        settings: {
          ...state.sync.settings,
          ...payload,
        },
      },
    }));
  },

  setDecksSync(payload) {
    set((state) => ({
      sync: {
        ...state.sync,
        decks: {
          ...state.sync.decks,
          ...payload,
        },
      },
    }));
  },

  setCampaignsSync(payload) {
    set((state) => ({
      sync: {
        ...state.sync,
        campaigns: {
          ...state.sync.campaigns,
          ...payload,
        },
      },
    }));
  },

  setFoldersSync(payload) {
    set((state) => ({
      sync: {
        ...state.sync,
        folders: {
          ...state.sync.folders,
          ...payload,
        },
      },
    }));
  },

  setAchievementsSync(payload) {
    set((state) => ({
      sync: {
        ...state.sync,
        achievements: {
          ...state.sync.achievements,
          ...payload,
        },
      },
    }));
  },

  setDeckSyncItem(id, payload) {
    set((state) => {
      const items = { ...state.sync.decks.items };
      const key = String(id);

      if (payload == null) {
        delete items[key];
      } else {
        items[key] = {
          ...getInitialDeckSyncItemState(),
          ...items[key],
          ...payload,
        };
      }

      return {
        sync: {
          ...state.sync,
          decks: {
            ...state.sync.decks,
            items,
          },
        },
      };
    });
  },

  setCampaignSyncItem(id, payload) {
    set((state) => {
      const items = { ...state.sync.campaigns.items };
      const key = String(id);

      if (payload == null) {
        delete items[key];
      } else {
        items[key] = {
          ...getInitialCampaignSyncItemState(),
          ...items[key],
          ...payload,
        };
      }

      return {
        sync: {
          ...state.sync,
          campaigns: {
            ...state.sync.campaigns,
            items,
          },
        },
      };
    });
  },

  // Stubs for folders sync
  loadRemoteFolders(_client) {
    // Implemented in Phase 8
    return Promise.resolve();
  },
  applyRemoteFolders(_payload) {
    // Implemented in Phase 8
    return Promise.resolve();
  },
  saveFolders(_client, _opts) {
    // Implemented in Phase 8
    return Promise.resolve();
  },

  // Stubs for achievements sync
  loadRemoteAchievements(_client) {
    // Implemented in Phase 8
    return Promise.resolve();
  },
  applyRemoteAchievements(_payload) {
    // Implemented in Phase 8
    return Promise.resolve();
  },
  saveAchievements(_client, _opts) {
    // Implemented in Phase 8
    return Promise.resolve();
  },

  // Stubs for settings sync
  loadRemoteSettings(_client) {
    // Implemented in Phase 8
    return Promise.resolve();
  },
  applyRemoteSettings(_payload) {
    // Implemented in Phase 8
    return Promise.resolve();
  },
  saveSettings(_client, _opts) {
    // Implemented in Phase 8
    return Promise.resolve();
  },

  // Stubs for decks/campaigns sync
  syncDecks(_client) {
    // Implemented in Phase 8
    return Promise.resolve();
  },
  syncCampaigns(_client) {
    // Implemented in Phase 8
    return Promise.resolve();
  },

  // Stubs for conflict resolution
  resolveDeckConflictWithRefresh(_client, _id) {
    // Implemented in Phase 8
    return Promise.resolve({ kind: "update" });
  },
  resolveDeckConflictWithDiscard(_id) {
    // Implemented in Phase 8
    return Promise.resolve({ kind: "delete" });
  },
  resolveCampaignConflictWithRefresh(_client, _id) {
    // Implemented in Phase 8
    return Promise.resolve({ kind: "update" });
  },
  resolveCampaignConflictWithDiscard(_id) {
    // Implemented in Phase 8
    return Promise.resolve({ kind: "delete" });
  },
});

function removeRemoteAccountData(state: StoreState) {
  const decks = { ...state.data.decks };
  const campaigns = { ...state.data.campaigns };
  const history = { ...state.data.history };
  const undoHistory = state.data.undoHistory
    ? { ...state.data.undoHistory }
    : undefined;
  const deckEdits = { ...state.deckEdits };
  const deckFolders = { ...state.data.deckFolders };

  // Decks: remove if source is 'account' or exists in sync.decks.items
  for (const [id, deck] of Object.entries(state.data.decks)) {
    if (deck.source === "account" || state.sync.decks.items[id]) {
      delete decks[id];
      delete history[id];
      delete undoHistory?.[id];
      delete deckEdits[id];
      delete deckFolders[id];
    }
  }

  // Campaigns: remove if exists in sync.campaigns.items
  for (const id of Object.keys(state.sync.campaigns.items)) {
    delete campaigns[id];
  }

  return {
    data: {
      ...state.data,
      decks,
      campaigns,
      history,
      undoHistory,
      deckFolders,
    },
    deckEdits,
  };
}

export function getLocalFolderSyncState(data: StoreState["data"]): FolderState {
  const folders = { ...data.folders };
  delete folders[ARCHIVE_FOLDER_ID];

  const deckFolders = Object.entries(data.deckFolders).reduce<
    FolderState["deckFolders"]
  >((acc, [deckId, folderId]) => {
    if (folderId === ARCHIVE_FOLDER_ID || folders[folderId]) {
      acc[deckId] = folderId;
    }

    return acc;
  }, {});

  return { folders, deckFolders };
}
