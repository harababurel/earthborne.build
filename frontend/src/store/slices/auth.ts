import type { CompleteProfileResponse } from "@earthborne-build/shared";
import type { StateCreator } from "zustand";
import { updateCampaignSyncSuccess, updateDeckSyncSuccess } from "../lib/sync";
import { dehydrate } from "../persist";
import {
  deleteAccount as deleteAccountRequest,
  fetchSession,
  postLogin,
  postLogout,
} from "../services/requests/auth";
import { ApiError } from "../services/requests/shared";
import type { AuthSlice, AuthState } from "./auth.types";
import type { StoreState } from "./index";

function getInitialAuthState(): AuthState {
  return {
    session: null,
    status: "idle",
  };
}

export const createAuthSlice: StateCreator<StoreState, [], [], AuthSlice> = (
  set,
  get,
) => ({
  auth: getInitialAuthState(),

  applyCompleteProfileResponse(response: CompleteProfileResponse) {
    const uploads = response.uploads;
    if (!uploads) return;

    set((state) => {
      const accountId = state.auth.session?.account.id;
      if (!accountId) return state;

      let data = state.data;
      let deckEdits = state.deckEdits;
      let sync = state.sync;

      if (uploads.decks?.length) {
        const now = Date.now();
        const deckIdMap = uploads.deckIdMap ?? {};
        const decks = { ...data.decks };
        const deckFolders = { ...data.deckFolders };
        const undoHistory = data.undoHistory
          ? { ...data.undoHistory }
          : undefined;
        const history = { ...data.history };
        deckEdits = { ...deckEdits };

        for (const [previousId, nextId] of Object.entries(deckIdMap)) {
          if (previousId !== nextId) {
            if (decks[previousId]) {
              decks[nextId] = decks[previousId];
              delete decks[previousId];
            }
            if (deckEdits[previousId]) {
              deckEdits[nextId] = deckEdits[previousId];
              delete deckEdits[previousId];
            }
            if (undoHistory?.[previousId]) {
              undoHistory[nextId] = undoHistory[previousId];
              delete undoHistory[previousId];
            }
            if (history[previousId]) {
              history[nextId] = history[previousId];
              delete history[previousId];
            }
            if (!uploads.folders && deckFolders[previousId] != null) {
              deckFolders[nextId] = deckFolders[previousId];
              delete deckFolders[previousId];
            }
          }
        }

        for (const deck of uploads.decks) {
          decks[deck.data.id] = deck.data;
          sync = updateDeckSyncSuccess(sync, deck.data.id, deck.revision, now);
        }

        data = {
          ...data,
          deckFolders,
          decks,
          history,
          undoHistory,
        };
      }

      if (uploads.campaigns?.length) {
        const now = Date.now();
        const campaignIdMap = uploads.campaignIdMap ?? {};
        const campaigns = { ...data.campaigns };

        for (const previousId of Object.keys(campaignIdMap)) {
          delete campaigns[previousId];
        }

        for (const campaign of uploads.campaigns) {
          campaigns[campaign.data.id] = campaign.data;
          sync = updateCampaignSyncSuccess(
            sync,
            campaign.data.id,
            campaign.revision,
            now,
          );
        }

        data = {
          ...data,
          campaigns,
        };
      }

      if (uploads.folders) {
        data = {
          ...data,
          deckFolders: uploads.folders.state?.deckFolders ?? {},
          folders: uploads.folders.state?.folders ?? {},
        };

        sync = {
          ...sync,
          folders: {
            accountId,
            revision: uploads.folders.revision,
            lastSyncedAt: Date.now(),
            status: "synced",
            error: null,
            conflict: null,
          },
        };
      }

      if (uploads.settings) {
        sync = {
          ...sync,
          settings: {
            accountId,
            revision: uploads.settings.revision,
            lastSyncedAt: Date.now(),
            status: "synced",
            error: null,
            conflict: null,
          },
        };
      }

      if (uploads.achievements) {
        sync = {
          ...sync,
          achievements: {
            accountId,
            revision: uploads.achievements.revision,
            lastSyncedAt: Date.now(),
            status: "synced",
            error: null,
            conflict: null,
          },
        };
      }

      return { data, deckEdits, sync };
    });
  },

  async deleteAccount(client) {
    try {
      await deleteAccountRequest(client);
    } finally {
      get().clearAccountState({ session: null, status: "unauthenticated" });
      setSessionInitialized(set, true);
      await dehydrate(get(), "app");
    }
  },

  async handleUnauthorized() {
    const state = get();

    const shouldReset =
      state.auth.session != null ||
      state.auth.status !== "unauthenticated" ||
      state.sync.settings.accountId != null ||
      state.sync.decks.accountId != null ||
      state.sync.folders.accountId != null;

    if (!shouldReset) {
      return;
    }

    get().clearAccountState({
      session: null,
      status: "unauthenticated",
    });
    setSessionInitialized(set, true);
    await dehydrate(get(), "app");
  },

  async initSession(client) {
    setSessionInitialized(set, false);
    set((state) => ({
      auth: { ...state.auth, status: "loading" },
    }));

    try {
      const session = await fetchSession(client);
      set({
        auth: { session, status: "authenticated" },
      });
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) {
        const session = get().auth.session;

        set({
          auth: {
            session,
            status: session ? "authenticated" : "unauthenticated",
          },
        });
      }
    }

    if (get().auth.status === "authenticated") {
      if (get().auth.session?.account.profileComplete) {
        try {
          await get().bootstrapAuthenticatedState(client);
        } catch (error) {
          console.error(error);
        }
      }
    }

    setSessionInitialized(set, true);

    await dehydrate(get(), "app");
  },

  async login(client, payload) {
    await postLogin(client, payload);

    const session = await fetchSession(client);
    set({
      auth: { session, status: "authenticated" },
    });
    setSessionInitialized(set, true);

    if (session.account.profileComplete) {
      try {
        await get().bootstrapAuthenticatedState(client);
      } catch (error) {
        console.error(error);
      }
    }

    await get().refreshSession(client);
    await dehydrate(get(), "app");
  },

  async logout(client) {
    try {
      await postLogout(client);
    } finally {
      get().clearAccountState({ session: null, status: "idle" });
      setSessionInitialized(set, true);
      await dehydrate(get(), "app");
    }
  },

  async refreshSession(client) {
    await refreshSession(set, get, client);
  },
});

function setSessionInitialized(
  set: Parameters<StateCreator<StoreState, [], [], AuthSlice>>[0],
  sessionInitialized: boolean,
) {
  set((state) => ({
    ui: {
      ...state.ui,
      sessionInitialized,
    },
  }));
}

async function refreshSession(
  set: Parameters<StateCreator<StoreState, [], [], AuthSlice>>[0],
  get: Parameters<StateCreator<StoreState, [], [], AuthSlice>>[1],
  client: Parameters<AuthSlice["initSession"]>[0],
) {
  if (get().auth.status !== "authenticated") {
    return;
  }

  try {
    const session = await fetchSession(client);

    if (get().auth.status !== "authenticated") {
      return;
    }

    set((state) => ({
      auth: {
        ...state.auth,
        session,
      },
    }));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await get().handleUnauthorized();
    }
  }
}
