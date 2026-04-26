import type { StoreState } from "@/store/slices";

function migrate(state: Partial<StoreState>, version: number) {
  if (version >= 11) {
    return state;
  }

  const settings = state.settings as
    | (StoreState["settings"] & {
        lists?: StoreState["settings"]["lists"] & {
          investigator?: unknown;
          role?: unknown;
        };
      })
    | undefined;

  const persistedLists = settings?.lists;
  if (!persistedLists) {
    return state;
  }

  delete persistedLists.investigator;
  delete persistedLists.role;

  return state;
}

export default migrate;
