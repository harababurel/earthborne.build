import type { StoreState } from "@/store/slices";

function migrate(_state: unknown, version: number) {
  const state = _state as StoreState;

  if (version < 14) {
    state.data.campaigns ??= {};
  }

  return state;
}

export default migrate;
