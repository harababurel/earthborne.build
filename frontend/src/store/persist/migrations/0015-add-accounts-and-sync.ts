import type { StoreState } from "@/store/slices";

function migrate(_state: unknown, version: number) {
  const state = _state as StoreState;

  if (version < 16) {
    state.auth ??= {
      session: null,
      status: "idle",
    };

    state.sync ??= {
      settings: {
        accountId: null,
        revision: null,
        lastSyncedAt: null,
        status: "idle",
        error: null,
        conflict: null,
      },
      decks: {
        accountId: null,
        manifestVersion: null,
        lastSyncedAt: null,
        status: "idle",
        error: null,
        items: {},
      },
      campaigns: {
        accountId: null,
        manifestVersion: null,
        lastSyncedAt: null,
        status: "idle",
        error: null,
        items: {},
      },
      folders: {
        accountId: null,
        revision: null,
        lastSyncedAt: null,
        status: "idle",
        error: null,
        conflict: null,
      },
      achievements: {
        accountId: null,
        revision: null,
        lastSyncedAt: null,
        status: "idle",
        error: null,
        conflict: null,
      },
    };
  }

  return state;
}

export default migrate;
