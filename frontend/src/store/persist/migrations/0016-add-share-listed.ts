import type { StoreState } from "@/store/slices";

function migrate(_state: unknown, version: number) {
  const state = _state as Partial<StoreState>;

  if (version < 17 && state.sharing) {
    state.sharing.listed ??= {};
  }

  return state;
}

export default migrate;
