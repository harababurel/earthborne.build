import type { StoreState } from "@/store/slices";
import type { SortingType } from "@/store/slices/lists.types";

const OLD_DEFAULT_SORT: SortingType[] = ["aspect", "name"];
const NEW_DEFAULT_SORT: SortingType[] = ["position"];

function migrate(state: Partial<StoreState>, version: number) {
  if (version >= 13) {
    return state;
  }

  const allList = state.settings?.lists?.all;
  if (!allList) {
    return state;
  }

  if (isOldDefaultSort(allList.sort)) {
    allList.sort = [...NEW_DEFAULT_SORT];
  }

  return state;
}

function isOldDefaultSort(sort: unknown): sort is SortingType[] {
  return (
    Array.isArray(sort) &&
    sort.length === OLD_DEFAULT_SORT.length &&
    sort.every((value, index) => value === OLD_DEFAULT_SORT[index])
  );
}

export default migrate;
