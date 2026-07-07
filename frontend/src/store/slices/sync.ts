import type {
  FolderState,
  Id,
  SyncManifestResponse,
} from "@earthborne-build/shared";
import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import { ARCHIVE_FOLDER_ID } from "@/utils/constants";
import { randomId } from "@/utils/crypto";
import { fromRemoteSettings, toRemoteSettings } from "../lib/settings-sync";
import {
  replaceCampaignSyncItems,
  replaceDeckSyncItems,
  updateCampaignSyncConflictError,
  updateCampaignSyncError,
  updateCampaignSyncSaving,
  updateCampaignSyncSuccess,
  updateDeckSyncConflictError,
  updateDeckSyncError,
  updateDeckSyncSaving,
  updateDeckSyncSuccess,
} from "../lib/sync";
import {
  applyRemoteCampaignReconciliation,
  applyRemoteDeckReconciliation,
  type ReconciliationItemPlan,
  reconcileItems,
} from "../lib/sync-reconciliation";
import { dehydrate } from "../persist";
import {
  fetchAchievements,
  isAchievementsConflictError,
  putAchievements,
} from "../services/requests/achievements";
import {
  deleteCampaign,
  fetchCampaignBatch,
  postCampaign,
  putCampaign,
} from "../services/requests/campaigns";
import {
  deleteDeck,
  fetchDeckBatch,
  fetchSyncManifest,
  postDeck,
  putDeck,
} from "../services/requests/decks";
import {
  fetchFolders,
  isFoldersConflictError,
  putFolders,
} from "../services/requests/folders";
import {
  fetchSettings,
  isSettingsConflictError,
  putSettings,
} from "../services/requests/settings";
import { ApiError } from "../services/requests/shared";
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

const campaignPushTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};
let foldersPushTimeout: ReturnType<typeof setTimeout> | null = null;
let settingsPushTimeout: ReturnType<typeof setTimeout> | null = null;
let achievementsPushTimeout: ReturnType<typeof setTimeout> | null = null;

function clearPendingPushTimers() {
  for (const key of Object.keys(campaignPushTimeouts)) {
    clearTimeout(campaignPushTimeouts[key]);
    delete campaignPushTimeouts[key];
  }

  if (foldersPushTimeout) clearTimeout(foldersPushTimeout);
  if (settingsPushTimeout) clearTimeout(settingsPushTimeout);
  if (achievementsPushTimeout) clearTimeout(achievementsPushTimeout);
  foldersPushTimeout = null;
  settingsPushTimeout = null;
  achievementsPushTimeout = null;
}

export const createSyncSlice: StateCreator<StoreState, [], [], SyncSlice> = (
  set,
  get,
) => ({
  ...getInitialSyncState(),
  apiClient: null,
  setApiClient(client) {
    set({ apiClient: client });
  },

  async bootstrapAuthenticatedState(client) {
    const state = get();
    const accountId = state.auth.session?.account.id;

    if (state.auth.status !== "authenticated" || !accountId) {
      get().clearAccountState();
      return;
    }

    if (storedAccountIdMismatches(state.sync, accountId)) {
      get().clearAccountState();
    }

    const errors: unknown[] = [];

    try {
      await get().loadRemoteSettings(client);
    } catch (error) {
      errors.push(error);
    }

    try {
      await get().loadRemoteFolders(client);
    } catch (error) {
      errors.push(error);
    }

    try {
      await get().loadRemoteAchievements(client);
    } catch (error) {
      errors.push(error);
    }

    let manifest: SyncManifestResponse | undefined;
    try {
      manifest = await fetchSyncManifest(client);
    } catch (error) {
      errors.push(error);
      const message = getErrorMessage(error);
      get().setDecksSync({ accountId, status: "error", error: message });
      get().setCampaignsSync({ accountId, status: "error", error: message });
    }

    if (manifest) {
      try {
        await get().syncDecks(client, manifest);
      } catch (error) {
        errors.push(error);
      }

      try {
        await get().syncCampaigns(client, manifest);
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length === 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new Error(
        errors
          .map((e) => (e instanceof Error ? e.message : "Unknown error"))
          .join("; "),
      );
    }
  },

  clearAccountState(auth?: AuthState) {
    clearPendingPushTimers();
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

  // Folders sync
  async loadRemoteFolders(client) {
    const state = get();
    const accountId = state.auth.session?.account.id;
    assert(accountId, "Cannot load remote folders without an account.");

    state.setFoldersSync({
      accountId,
      status: "loading",
      error: null,
      conflict: null,
    });

    try {
      const response = await fetchFolders(client);
      if (!isCurrentAccount(get(), accountId)) return;

      if (response.revision == null || response.state == null) {
        await get().saveFolders(client, { expectedRevision: null });
        return;
      }

      await get().applyRemoteFolders(response);
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) return;
      get().setFoldersSync({
        accountId,
        status: "error",
        error: getErrorMessage(error),
        conflict: null,
      });
      await dehydrate(get(), "app");
      throw error;
    }
  },

  async applyRemoteFolders(payload) {
    const accountId = get().auth.session?.account.id;
    assert(accountId, "Cannot apply remote folders without an account.");

    set((state) => ({
      data: {
        ...state.data,
        folders: payload.state.folders,
        deckFolders: payload.state.deckFolders,
      },
      sync: {
        ...state.sync,
        folders: {
          ...state.sync.folders,
          accountId,
          revision: payload.revision,
          lastSyncedAt: Date.now(),
          status: "synced",
          error: null,
          conflict: null,
        },
      },
    }));

    await dehydrate(get(), "app");
  },

  async saveFolders(client, opts) {
    const state = get();
    const accountId = state.auth.session?.account.id;
    assert(accountId, "Cannot save folders without an account.");

    const expectedRevision =
      opts?.expectedRevision !== undefined
        ? opts.expectedRevision
        : state.sync.folders.accountId === accountId
          ? state.sync.folders.revision
          : null;

    state.setFoldersSync({
      accountId,
      status: "saving",
      error: null,
      conflict: null,
    });

    try {
      const response = await putFolders(client, {
        expectedRevision,
        state: getLocalFolderSyncState(get().data),
      });

      if (!isCurrentAccount(get(), accountId)) return;

      get().setFoldersSync({
        accountId,
        revision: response.revision,
        lastSyncedAt: Date.now(),
        status: "synced",
        error: null,
        conflict: null,
      });
      await dehydrate(get(), "app");
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) return;

      if (isFoldersConflictError(error)) {
        get().setFoldersSync({
          accountId,
          status: "conflict",
          error: getErrorMessage(error),
          conflict: error.remote,
        });
      } else {
        get().setFoldersSync({
          accountId,
          status: "error",
          error: getErrorMessage(error),
          conflict: null,
        });
      }

      await dehydrate(get(), "app");
      throw error;
    }
  },

  // Achievements sync
  async loadRemoteAchievements(client) {
    const state = get();
    const accountId = state.auth.session?.account.id;
    assert(accountId, "Cannot load remote achievements without an account.");

    state.setAchievementsSync({
      accountId,
      status: "loading",
      error: null,
      conflict: null,
    });

    try {
      const response = await fetchAchievements(client);
      if (!isCurrentAccount(get(), accountId)) return;

      if (response.revision == null || response.state == null) {
        await get().saveAchievements(client, { expectedRevision: null });
        return;
      }

      await get().applyRemoteAchievements(response);
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) return;
      get().setAchievementsSync({
        accountId,
        status: "error",
        error: getErrorMessage(error),
        conflict: null,
      });
      await dehydrate(get(), "app");
      throw error;
    }
  },

  async applyRemoteAchievements(payload) {
    const accountId = get().auth.session?.account.id;
    assert(accountId, "Cannot apply remote achievements without an account.");

    set((state) => ({
      achievements: payload.state,
      sync: {
        ...state.sync,
        achievements: {
          ...state.sync.achievements,
          accountId,
          revision: payload.revision,
          lastSyncedAt: Date.now(),
          status: "synced",
          error: null,
          conflict: null,
        },
      },
    }));

    await dehydrate(get(), "app");
  },

  async saveAchievements(client, opts) {
    const state = get();
    const accountId = state.auth.session?.account.id;
    assert(accountId, "Cannot save achievements without an account.");

    const expectedRevision =
      opts?.expectedRevision !== undefined
        ? opts.expectedRevision
        : state.sync.achievements.accountId === accountId
          ? state.sync.achievements.revision
          : null;

    state.setAchievementsSync({
      accountId,
      status: "saving",
      error: null,
      conflict: null,
    });

    try {
      const response = await putAchievements(client, {
        expectedRevision,
        state: get().achievements,
      });

      if (!isCurrentAccount(get(), accountId)) return;

      get().setAchievementsSync({
        accountId,
        revision: response.revision,
        lastSyncedAt: Date.now(),
        status: "synced",
        error: null,
        conflict: null,
      });
      await dehydrate(get(), "app");
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) return;

      if (isAchievementsConflictError(error)) {
        get().setAchievementsSync({
          accountId,
          status: "conflict",
          error: getErrorMessage(error),
          conflict: error.remote,
        });
      } else {
        get().setAchievementsSync({
          accountId,
          status: "error",
          error: getErrorMessage(error),
          conflict: null,
        });
      }

      await dehydrate(get(), "app");
      throw error;
    }
  },

  // Settings sync
  async loadRemoteSettings(client) {
    const state = get();
    const accountId = state.auth.session?.account.id;
    assert(accountId, "Cannot load remote settings without an account.");

    state.setSettingsSync({
      accountId,
      status: "loading",
      error: null,
      conflict: null,
    });

    try {
      const response = await fetchSettings(client);
      if (!isCurrentAccount(get(), accountId)) return;

      if (response.revision == null || response.settings == null) {
        await get().saveSettings(client, { expectedRevision: null });
        return;
      }

      await get().applyRemoteSettings(response);
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) return;
      get().setSettingsSync({
        accountId,
        status: "error",
        error: getErrorMessage(error),
        conflict: null,
      });
      await dehydrate(get(), "app");
      throw error;
    }
  },

  async applyRemoteSettings(payload) {
    const accountId = get().auth.session?.account.id;
    assert(accountId, "Cannot apply remote settings without an account.");

    const settings = fromRemoteSettings(payload.settings, get().settings);

    if (settings.locale !== get().settings.locale) {
      await get().applySettings(settings);
    } else {
      set({ settings });
    }

    set((state) => ({
      sync: {
        ...state.sync,
        settings: {
          ...state.sync.settings,
          accountId,
          revision: payload.revision,
          lastSyncedAt: Date.now(),
          status: "synced",
          error: null,
          conflict: null,
        },
      },
    }));

    await dehydrate(get(), "app");
  },

  async saveSettings(client, opts) {
    const state = get();
    const accountId = state.auth.session?.account.id;
    assert(accountId, "Cannot save settings without an account.");

    const expectedRevision =
      opts?.expectedRevision !== undefined
        ? opts.expectedRevision
        : state.sync.settings.accountId === accountId
          ? state.sync.settings.revision
          : null;

    state.setSettingsSync({
      accountId,
      status: "saving",
      error: null,
      conflict: null,
    });

    try {
      const response = await putSettings(client, {
        expectedRevision,
        settings: toRemoteSettings(get().settings),
      });

      if (!isCurrentAccount(get(), accountId)) return;

      get().setSettingsSync({
        accountId,
        revision: response.revision,
        lastSyncedAt: Date.now(),
        status: "synced",
        error: null,
        conflict: null,
      });
      await dehydrate(get(), "app");
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) return;

      if (isSettingsConflictError(error)) {
        get().setSettingsSync({
          accountId,
          status: "conflict",
          error: getErrorMessage(error),
          conflict: error.remote,
        });
      } else {
        get().setSettingsSync({
          accountId,
          status: "error",
          error: getErrorMessage(error),
          conflict: null,
        });
      }

      await dehydrate(get(), "app");
      throw error;
    }
  },

  async syncAll(client) {
    await get().bootstrapAuthenticatedState(client);
  },

  // Decks sync
  async syncDecks(client, providedManifest) {
    const state = get();
    const accountId = state.auth.session?.account.id;
    assert(accountId, "Cannot sync decks without an account.");

    state.setDecksSync({
      accountId,
      status: "loading",
      error: null,
    });

    try {
      const manifest = providedManifest ?? (await fetchSyncManifest(client));
      if (!isCurrentAccount(get(), accountId)) return;

      const syncDecks = get().sync.decks;

      // Type-cast local decks to ReconciliationItemInput
      const localDecks = Object.entries(get().data.decks).reduce<
        Record<string, { id: Id; date_update: string }>
      >((acc, [id, deck]) => {
        acc[id] = { id: deck.id, date_update: deck.date_update };
        return acc;
      }, {});

      const plan = reconcileItems(localDecks, syncDecks.items, manifest.decks);

      const fetchedDecks = plan.downloads.length
        ? await fetchDeckBatch(client, { ids: plan.downloads })
        : [];

      if (!isCurrentAccount(get(), accountId)) return;

      const result = applyRemoteDeckReconciliation({
        accountId,
        dataDecks: get().data.decks,
        deckFolders: get().data.deckFolders,
        undoHistory: get().data.undoHistory,
        deckEdits: get().deckEdits,
        manifestDecks: manifest.decks,
        plan,
        remoteDecks: fetchedDecks,
        syncDecks: get().sync.decks,
      });

      set((prev) => ({
        data: {
          ...prev.data,
          decks: result.decks,
          deckFolders: result.deckFolders,
          undoHistory: result.undoHistory,
        },
        deckEdits: result.deckEdits,
        sync: {
          ...prev.sync,
          decks: result.syncDecks,
        },
      }));

      // Background pushes
      await performDeckSyncPushes(client, plan, get());

      // Push handlers set per-item states; recompute the aggregate from them.
      set((prev) => ({
        sync: replaceDeckSyncItems(prev.sync, prev.sync.decks.items),
      }));

      await dehydrate(get(), "app", "edits");
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) return;
      get().setDecksSync({
        accountId,
        status: "error",
        error: getErrorMessage(error),
      });
      await dehydrate(get(), "app");
      throw error;
    }
  },

  async pushDeck(client, id) {
    const state = get();
    const accountId = state.auth.session?.account.id;
    assert(accountId, "Cannot push deck without an account.");

    const deck = state.data.decks[id];
    if (!deck) return;

    const syncItem = state.sync.decks.items[id];

    if (syncItem?.status === "conflict") return;

    get().setDeckSyncItem(id, {
      status: "saving",
      error: null,
      conflict: null,
    });

    let currentId = id;
    try {
      if (syncItem?.version == null) {
        try {
          const response = await postDeck(client, { data: deck });
          if (!isCurrentAccount(get(), accountId)) return;

          get().setDeckSyncItem(id, {
            version: response.revision,
            status: "synced",
            lastSyncedAt: Date.now(),
            error: null,
            conflict: null,
          });
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) {
            const newId = randomId();
            set((prev) => rekeyDeckId(prev, id, newId));
            currentId = newId;

            const rekeyedDeck = get().data.decks[newId];
            if (rekeyedDeck) {
              const response = await postDeck(client, { data: rekeyedDeck });
              if (!isCurrentAccount(get(), accountId)) return;

              get().setDeckSyncItem(newId, {
                version: response.revision,
                status: "synced",
                lastSyncedAt: Date.now(),
                error: null,
                conflict: null,
              });

              // Re-keying rewrote references in campaigns and folders; their
              // server copies still point at the old id until pushed.
              for (const campaign of Object.values(get().data.campaigns)) {
                if (campaign.deck_ids.includes(newId)) {
                  get().scheduleCampaignPush(client, campaign.id);
                }
              }
              if (get().data.deckFolders[String(newId)] != null) {
                get().scheduleFoldersPush(client);
              }
            }
          } else {
            throw error;
          }
        }
      } else {
        const response = await putDeck(client, String(id), {
          data: deck,
          expectedRevision: syncItem.version,
        });
        if (!isCurrentAccount(get(), accountId)) return;

        get().setDeckSyncItem(id, {
          version: response.revision,
          status: "synced",
          lastSyncedAt: Date.now(),
          error: null,
          conflict: null,
        });
      }
      await dehydrate(get(), "app", "edits");
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) return;

      set((prev) => ({
        sync: updateDeckSyncError(prev.sync, currentId, error, "update"),
      }));

      await dehydrate(get(), "app", "edits");
      throw error;
    }
  },

  async pushDeckDeletion(client, id, expectedRevision) {
    const state = get();
    const accountId = state.auth.session?.account.id;
    assert(accountId, "Cannot push deck deletion without an account.");

    const syncItem = state.sync.decks.items[id];
    const revision = expectedRevision ?? syncItem?.version;
    if (revision == null) {
      get().setDeckSyncItem(id, null);
      return;
    }

    get().setDeckSyncItem(id, {
      status: "saving",
      error: null,
      conflict: null,
    });

    try {
      await deleteDeck(client, String(id), { expectedRevision: revision });
      if (!isCurrentAccount(get(), accountId)) return;

      get().setDeckSyncItem(id, null);
      await dehydrate(get(), "app", "edits");
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) return;

      set((prev) => ({
        sync: updateDeckSyncError(prev.sync, id, error, "delete"),
      }));

      await dehydrate(get(), "app", "edits");
      throw error;
    }
  },

  // Campaigns sync
  async syncCampaigns(client, providedManifest) {
    const state = get();
    const accountId = state.auth.session?.account.id;
    assert(accountId, "Cannot sync campaigns without an account.");

    state.setCampaignsSync({
      accountId,
      status: "loading",
      error: null,
    });

    try {
      const manifest = providedManifest ?? (await fetchSyncManifest(client));
      if (!isCurrentAccount(get(), accountId)) return;

      const syncCampaigns = get().sync.campaigns;

      const localCampaigns = Object.entries(get().data.campaigns).reduce<
        Record<string, { id: Id; date_update: string }>
      >((acc, [id, campaign]) => {
        acc[id] = { id: campaign.id, date_update: campaign.date_update };
        return acc;
      }, {});

      const plan = reconcileItems(
        localCampaigns,
        syncCampaigns.items,
        manifest.campaigns,
      );

      const fetchedCampaigns = plan.downloads.length
        ? await fetchCampaignBatch(client, { ids: plan.downloads })
        : [];

      if (!isCurrentAccount(get(), accountId)) return;

      const result = applyRemoteCampaignReconciliation({
        accountId,
        dataCampaigns: get().data.campaigns,
        undoHistory: get().data.undoHistory,
        manifestCampaigns: manifest.campaigns,
        plan,
        remoteCampaigns: fetchedCampaigns,
        syncCampaigns: get().sync.campaigns,
      });

      set((prev) => ({
        data: {
          ...prev.data,
          campaigns: result.campaigns,
          undoHistory: result.undoHistory,
        },
        sync: {
          ...prev.sync,
          campaigns: result.syncCampaigns,
        },
      }));

      // Background pushes
      await performCampaignSyncPushes(client, plan, get());

      set((prev) => ({
        sync: replaceCampaignSyncItems(prev.sync, prev.sync.campaigns.items),
      }));

      await dehydrate(get(), "app");
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) return;
      get().setCampaignsSync({
        accountId,
        status: "error",
        error: getErrorMessage(error),
      });
      await dehydrate(get(), "app");
      throw error;
    }
  },

  async pushCampaign(client, id) {
    const state = get();
    const accountId = state.auth.session?.account.id;
    assert(accountId, "Cannot push campaign without an account.");

    const campaign = state.data.campaigns[id];
    if (!campaign) return;

    const syncItem = state.sync.campaigns.items[id];

    if (syncItem?.status === "conflict") return;

    get().setCampaignSyncItem(id, {
      status: "saving",
      error: null,
      conflict: null,
    });

    let currentId = id;
    try {
      if (syncItem?.version == null) {
        try {
          const response = await postCampaign(client, { data: campaign });
          if (!isCurrentAccount(get(), accountId)) return;

          get().setCampaignSyncItem(id, {
            version: response.revision,
            status: "synced",
            lastSyncedAt: Date.now(),
            error: null,
            conflict: null,
          });
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) {
            const newId = randomId();
            set((prev) => rekeyCampaignId(prev, id, newId));
            currentId = newId;

            const rekeyedCampaign = get().data.campaigns[newId];
            if (rekeyedCampaign) {
              const response = await postCampaign(client, {
                data: rekeyedCampaign,
              });
              if (!isCurrentAccount(get(), accountId)) return;

              get().setCampaignSyncItem(newId, {
                version: response.revision,
                status: "synced",
                lastSyncedAt: Date.now(),
                error: null,
                conflict: null,
              });
            }
          } else {
            throw error;
          }
        }
      } else {
        const response = await putCampaign(client, String(id), {
          data: campaign,
          expectedRevision: syncItem.version,
        });
        if (!isCurrentAccount(get(), accountId)) return;

        get().setCampaignSyncItem(id, {
          version: response.revision,
          status: "synced",
          lastSyncedAt: Date.now(),
          error: null,
          conflict: null,
        });
      }
      await dehydrate(get(), "app");
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) return;

      set((prev) => ({
        sync: updateCampaignSyncError(prev.sync, currentId, error, "update"),
      }));

      await dehydrate(get(), "app");
      throw error;
    }
  },

  async pushCampaignDeletion(client, id, expectedRevision) {
    const state = get();
    const accountId = state.auth.session?.account.id;
    assert(accountId, "Cannot push campaign deletion without an account.");

    const syncItem = state.sync.campaigns.items[id];
    const revision = expectedRevision ?? syncItem?.version;
    if (revision == null) {
      get().setCampaignSyncItem(id, null);
      return;
    }

    get().setCampaignSyncItem(id, {
      status: "saving",
      error: null,
      conflict: null,
    });

    try {
      await deleteCampaign(client, String(id), { expectedRevision: revision });
      if (!isCurrentAccount(get(), accountId)) return;

      get().setCampaignSyncItem(id, null);
      await dehydrate(get(), "app");
    } catch (error) {
      if (!isCurrentAccount(get(), accountId)) return;

      set((prev) => ({
        sync: updateCampaignSyncError(prev.sync, id, error, "delete"),
      }));

      await dehydrate(get(), "app");
      throw error;
    }
  },

  scheduleCampaignPush(client, id) {
    const key = String(id);
    clearTimeout(campaignPushTimeouts[key]);

    campaignPushTimeouts[key] = setTimeout(() => {
      delete campaignPushTimeouts[key];
      get().pushCampaign(client, id).catch(console.error);
    }, 2000);
  },

  scheduleFoldersPush(client) {
    if (foldersPushTimeout) clearTimeout(foldersPushTimeout);

    foldersPushTimeout = setTimeout(() => {
      foldersPushTimeout = null;
      get().saveFolders(client).catch(console.error);
    }, 2000);
  },

  scheduleSettingsPush(client) {
    if (settingsPushTimeout) clearTimeout(settingsPushTimeout);

    settingsPushTimeout = setTimeout(() => {
      settingsPushTimeout = null;
      get().saveSettings(client).catch(console.error);
    }, 2000);
  },

  scheduleAchievementsPush(client) {
    if (achievementsPushTimeout) clearTimeout(achievementsPushTimeout);

    achievementsPushTimeout = setTimeout(() => {
      achievementsPushTimeout = null;
      get().saveAchievements(client).catch(console.error);
    }, 2000);
  },

  // Conflict resolution
  async resolveDeckConflictWithPush(client, id) {
    const conflict = getDeckConflict(get(), id);
    assert(
      conflict.remoteVersion != null,
      `Deck ${id} has no remote copy to overwrite.`,
    );

    const deck = get().data.decks[id];
    assert(deck, `Deck ${id} does not exist locally.`);

    set((prev) => ({
      sync: updateDeckSyncSaving(prev.sync, id),
    }));

    try {
      const response = await putDeck(client, String(id), {
        data: deck,
        expectedRevision: conflict.remoteVersion,
      });

      set((prev) => ({
        sync: updateDeckSyncSuccess(
          prev.sync,
          id,
          response.revision,
          Date.now(),
        ),
      }));
      await dehydrate(get(), "app", "edits");

      return { kind: conflict.kind };
    } catch (error) {
      set((prev) => ({
        sync: updateDeckSyncConflictError(prev.sync, id, error, conflict.kind),
      }));
      await dehydrate(get(), "app", "edits");
      throw error;
    }
  },

  async resolveDeckConflictWithRefresh(client, id) {
    const conflict = getDeckConflict(get(), id);

    set((prev) => ({
      sync: updateDeckSyncSaving(prev.sync, id),
    }));

    try {
      const [remoteDeck] = await fetchDeckBatch(client, {
        ids: [String(id)],
      });
      assert(remoteDeck, `Remote deck ${id} could not be loaded.`);

      set((prev) => {
        const decks = {
          ...prev.data.decks,
          [id]: remoteDeck.data,
        };
        const deckEdits = { ...prev.deckEdits };
        const undoHistory = prev.data.undoHistory
          ? { ...prev.data.undoHistory }
          : undefined;

        delete deckEdits[id];
        delete undoHistory?.[id];

        return {
          data: {
            ...prev.data,
            decks,
            undoHistory,
          },
          deckEdits,
          sync: updateDeckSyncSuccess(
            prev.sync,
            id,
            remoteDeck.revision,
            Date.now(),
          ),
        };
      });
      await dehydrate(get(), "app", "edits");

      return { kind: conflict.kind };
    } catch (error) {
      set((prev) => ({
        sync: updateDeckSyncConflictError(prev.sync, id, error, conflict.kind),
      }));
      await dehydrate(get(), "app", "edits");
      throw error;
    }
  },

  async resolveDeckConflictWithDiscard(id) {
    const conflict = getDeckConflict(get(), id);
    assert(
      conflict.remoteVersion == null,
      `Deck ${id} still has a remote copy to refresh.`,
    );

    set((prev) => ({
      sync: updateDeckSyncSaving(prev.sync, id),
    }));

    try {
      set((prev) => {
        const decks = { ...prev.data.decks };
        const deckFolders = { ...prev.data.deckFolders };
        const deckEdits = { ...prev.deckEdits };
        const undoHistory = prev.data.undoHistory
          ? { ...prev.data.undoHistory }
          : undefined;

        delete decks[id];
        delete deckFolders[id];
        delete deckEdits[id];
        delete undoHistory?.[id];

        const syncItems = { ...prev.sync.decks.items };
        delete syncItems[id];

        return {
          data: {
            ...prev.data,
            decks,
            deckFolders,
            undoHistory,
          },
          deckEdits,
          sync: {
            ...prev.sync,
            decks: {
              ...prev.sync.decks,
              items: syncItems,
            },
          },
        };
      });
      await dehydrate(get(), "app", "edits");

      return { kind: conflict.kind };
    } catch (error) {
      set((prev) => ({
        sync: updateDeckSyncConflictError(prev.sync, id, error, conflict.kind),
      }));
      await dehydrate(get(), "app", "edits");
      throw error;
    }
  },

  async resolveCampaignConflictWithPush(client, id) {
    const conflict = getCampaignConflict(get(), id);
    assert(
      conflict.remoteVersion != null,
      `Campaign ${id} has no remote copy to overwrite.`,
    );

    const campaign = get().data.campaigns[id];
    assert(campaign, `Campaign ${id} does not exist locally.`);

    set((prev) => ({
      sync: updateCampaignSyncSaving(prev.sync, id),
    }));

    try {
      const response = await putCampaign(client, String(id), {
        data: campaign,
        expectedRevision: conflict.remoteVersion,
      });

      set((prev) => ({
        sync: updateCampaignSyncSuccess(
          prev.sync,
          id,
          response.revision,
          Date.now(),
        ),
      }));
      await dehydrate(get(), "app");

      return { kind: conflict.kind };
    } catch (error) {
      set((prev) => ({
        sync: updateCampaignSyncConflictError(
          prev.sync,
          id,
          error,
          conflict.kind,
        ),
      }));
      await dehydrate(get(), "app");
      throw error;
    }
  },

  async resolveCampaignConflictWithRefresh(client, id) {
    const conflict = getCampaignConflict(get(), id);

    set((prev) => ({
      sync: updateCampaignSyncSaving(prev.sync, id),
    }));

    try {
      const [remoteCampaign] = await fetchCampaignBatch(client, {
        ids: [String(id)],
      });
      assert(remoteCampaign, `Remote campaign ${id} could not be loaded.`);

      set((prev) => {
        const campaigns = {
          ...prev.data.campaigns,
          [id]: remoteCampaign.data,
        };
        const undoHistory = prev.data.undoHistory
          ? { ...prev.data.undoHistory }
          : undefined;

        delete undoHistory?.[id];

        return {
          data: {
            ...prev.data,
            campaigns,
            undoHistory,
          },
          sync: updateCampaignSyncSuccess(
            prev.sync,
            id,
            remoteCampaign.revision,
            Date.now(),
          ),
        };
      });
      await dehydrate(get(), "app");

      return { kind: conflict.kind };
    } catch (error) {
      set((prev) => ({
        sync: updateCampaignSyncConflictError(
          prev.sync,
          id,
          error,
          conflict.kind,
        ),
      }));
      await dehydrate(get(), "app");
      throw error;
    }
  },

  async resolveCampaignConflictWithDiscard(id) {
    const conflict = getCampaignConflict(get(), id);
    assert(
      conflict.remoteVersion == null,
      `Campaign ${id} still has a remote copy to refresh.`,
    );

    set((prev) => ({
      sync: updateCampaignSyncSaving(prev.sync, id),
    }));

    try {
      set((prev) => {
        const campaigns = { ...prev.data.campaigns };
        const undoHistory = prev.data.undoHistory
          ? { ...prev.data.undoHistory }
          : undefined;

        delete campaigns[id];
        delete undoHistory?.[id];

        const syncItems = { ...prev.sync.campaigns.items };
        delete syncItems[id];

        return {
          data: {
            ...prev.data,
            campaigns,
            undoHistory,
          },
          sync: {
            ...prev.sync,
            campaigns: {
              ...prev.sync.campaigns,
              items: syncItems,
            },
          },
        };
      });
      await dehydrate(get(), "app");

      return { kind: conflict.kind };
    } catch (error) {
      set((prev) => ({
        sync: updateCampaignSyncConflictError(
          prev.sync,
          id,
          error,
          conflict.kind,
        ),
      }));
      await dehydrate(get(), "app");
      throw error;
    }
  },
});

function isCurrentAccount(state: StoreState, accountId: string) {
  return (
    state.auth.status === "authenticated" &&
    state.auth.session?.account.id === accountId
  );
}

function getDeckConflict(state: StoreState, id: string | number) {
  const conflict = state.sync.decks.items[id]?.conflict;
  assert(conflict, `Deck ${id} does not have a conflict.`);
  return conflict;
}

function getCampaignConflict(state: StoreState, id: string | number) {
  const conflict = state.sync.campaigns.items[id]?.conflict;
  assert(conflict, `Campaign ${id} does not have a conflict.`);
  return conflict;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function storedAccountIdMismatches(sync: SyncState["sync"], accountId: string) {
  return (
    accountIdMismatches(sync.settings.accountId, accountId) ||
    accountIdMismatches(sync.decks.accountId, accountId) ||
    accountIdMismatches(sync.campaigns.accountId, accountId) ||
    accountIdMismatches(sync.folders.accountId, accountId) ||
    accountIdMismatches(sync.achievements.accountId, accountId)
  );
}

function accountIdMismatches(
  storedAccountId: string | null,
  accountId: string,
) {
  return storedAccountId !== null && storedAccountId !== accountId;
}

function removeRemoteAccountData(state: StoreState) {
  const decks = { ...state.data.decks };
  const campaigns = { ...state.data.campaigns };
  const history = { ...state.data.history };
  const undoHistory = state.data.undoHistory
    ? { ...state.data.undoHistory }
    : undefined;
  const deckEdits = { ...state.deckEdits };
  const deckFolders = { ...state.data.deckFolders };

  for (const [id, deck] of Object.entries(state.data.decks)) {
    if (deck.source === "account" || state.sync.decks.items[id]) {
      delete decks[id];
      delete history[id];
      delete undoHistory?.[id];
      delete deckEdits[id];
      delete deckFolders[id];
    }
  }

  for (const id of Object.keys(state.sync.campaigns.items)) {
    delete campaigns[id];
    delete undoHistory?.[id];
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

async function performDeckSyncPushes(
  client: Parameters<typeof postDeck>[0],
  plan: ReconciliationItemPlan,
  state: StoreState,
) {
  // 1. Upload local-only decks
  for (const id of plan.uploads) {
    const deck = state.data.decks[id];
    if (deck) {
      try {
        const response = await postDeck(client, { data: deck });
        state.setDeckSyncItem(id, {
          version: response.revision,
          status: "synced",
          lastSyncedAt: Date.now(),
          error: null,
          conflict: null,
        });
      } catch (err) {
        state.setDeckSyncItem(id, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }
    }
  }

  // 2. Push local updates (PUT)
  for (const id of plan.pushes) {
    const deck = state.data.decks[id];
    const syncItem = state.sync.decks.items[id];
    if (deck && syncItem?.version) {
      try {
        const response = await putDeck(client, id, {
          data: deck,
          expectedRevision: syncItem.version,
        });
        state.setDeckSyncItem(id, {
          version: response.revision,
          status: "synced",
          lastSyncedAt: Date.now(),
          error: null,
          conflict: null,
        });
      } catch (err) {
        state.setDeckSyncItem(id, {
          status: "error",
          error: err instanceof Error ? err.message : "Push failed",
        });
      }
    }
  }

  // 3. Push remote deletions
  for (const id of plan.remoteDeletions) {
    const syncItem = state.sync.decks.items[id];
    if (syncItem?.version) {
      try {
        await deleteDeck(client, id, {
          expectedRevision: syncItem.version,
        });
        state.setDeckSyncItem(id, null);
      } catch (err) {
        state.setDeckSyncItem(id, {
          status: "error",
          error: err instanceof Error ? err.message : "Delete failed",
        });
      }
    }
  }
}

async function performCampaignSyncPushes(
  client: Parameters<typeof postCampaign>[0],
  plan: ReconciliationItemPlan,
  state: StoreState,
) {
  // 1. Upload local-only campaigns
  for (const id of plan.uploads) {
    const campaign = state.data.campaigns[id];
    if (campaign) {
      try {
        const response = await postCampaign(client, { data: campaign });
        state.setCampaignSyncItem(id, {
          version: response.revision,
          status: "synced",
          lastSyncedAt: Date.now(),
          error: null,
          conflict: null,
        });
      } catch (err) {
        state.setCampaignSyncItem(id, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }
    }
  }

  // 2. Push local updates (PUT)
  for (const id of plan.pushes) {
    const campaign = state.data.campaigns[id];
    const syncItem = state.sync.campaigns.items[id];
    if (campaign && syncItem?.version) {
      try {
        const response = await putCampaign(client, id, {
          data: campaign,
          expectedRevision: syncItem.version,
        });
        state.setCampaignSyncItem(id, {
          version: response.revision,
          status: "synced",
          lastSyncedAt: Date.now(),
          error: null,
          conflict: null,
        });
      } catch (err) {
        state.setCampaignSyncItem(id, {
          status: "error",
          error: err instanceof Error ? err.message : "Push failed",
        });
      }
    }
  }

  // 3. Push remote deletions
  for (const id of plan.remoteDeletions) {
    const syncItem = state.sync.campaigns.items[id];
    if (syncItem?.version) {
      try {
        await deleteCampaign(client, id, {
          expectedRevision: syncItem.version,
        });
        state.setCampaignSyncItem(id, null);
      } catch (err) {
        state.setCampaignSyncItem(id, {
          status: "error",
          error: err instanceof Error ? err.message : "Delete failed",
        });
      }
    }
  }
}

function rekeyDeckId(state: StoreState, oldId: Id, newId: Id) {
  const decks = { ...state.data.decks };
  const deckFolders = { ...state.data.deckFolders };
  const undoHistory = state.data.undoHistory
    ? { ...state.data.undoHistory }
    : undefined;
  const deckEdits = { ...state.deckEdits };
  const campaigns = { ...state.data.campaigns };
  const history = { ...state.data.history };

  if (decks[oldId]) {
    decks[newId] = { ...decks[oldId], id: newId };
    delete decks[oldId];
  }

  if (deckFolders[oldId]) {
    deckFolders[newId] = deckFolders[oldId];
    delete deckFolders[oldId];
  }

  if (undoHistory?.[oldId]) {
    undoHistory[newId] = undoHistory[oldId];
    delete undoHistory[oldId];
  }

  if (deckEdits[oldId]) {
    deckEdits[newId] = deckEdits[oldId];
    delete deckEdits[oldId];
  }

  if (history[oldId]) {
    history[newId] = history[oldId];
    delete history[oldId];
  }

  for (const [key, list] of Object.entries(history)) {
    if (list.includes(oldId)) {
      history[key] = list.map((item) => (item === oldId ? newId : item));
    }
  }

  for (const [cid, campaign] of Object.entries(campaigns)) {
    if (campaign.deck_ids.includes(oldId)) {
      campaigns[cid] = {
        ...campaign,
        deck_ids: campaign.deck_ids.map((id) => (id === oldId ? newId : id)),
      };
    }
  }

  return {
    data: {
      ...state.data,
      decks,
      deckFolders,
      undoHistory,
      campaigns,
      history,
    },
    deckEdits,
  };
}

function rekeyCampaignId(state: StoreState, oldId: Id, newId: Id) {
  const campaigns = { ...state.data.campaigns };
  const undoHistory = state.data.undoHistory
    ? { ...state.data.undoHistory }
    : undefined;

  if (campaigns[oldId]) {
    campaigns[newId] = { ...campaigns[oldId], id: newId };
    delete campaigns[oldId];
  }

  if (undoHistory?.[oldId]) {
    undoHistory[newId] = undoHistory[oldId];
    delete undoHistory[oldId];
  }

  return {
    data: {
      ...state.data,
      campaigns,
      undoHistory,
    },
  };
}
