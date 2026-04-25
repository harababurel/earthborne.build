import type { StoreState } from "@/store/slices";
import { getInitialListsSetting } from "@/store/slices/settings";

function migrate(state: Partial<StoreState>, version: number) {
  if (version >= 10) {
    return state;
  }

  const settings = state.settings as
    | (StoreState["settings"] & {
        lists?: StoreState["settings"]["lists"] & { investigator?: unknown };
      })
    | undefined;
  const persistedLists = settings?.lists;
  if (!persistedLists) {
    return state;
  }

  const nextRoleList =
    persistedLists.role ??
    (persistedLists.investigator as StoreState["settings"]["lists"]["role"]) ??
    getInitialListsSetting().role;

  persistedLists.role = nextRoleList;
  delete persistedLists.investigator;

  return state;
}

export default migrate;
