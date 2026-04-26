import type { StoreState } from "@/store/slices";

function migrate(_state: unknown, version: number) {
  const state = _state as StoreState;
  const persistedLists = state.settings?.lists as
    | (typeof state.settings.lists & { investigator?: unknown })
    | undefined;

  if (version < 5) {
    if (persistedLists?.investigator) {
      delete persistedLists.investigator;
    }
  }

  return state;
}

export default migrate;
