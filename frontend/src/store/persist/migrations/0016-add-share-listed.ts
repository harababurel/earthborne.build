import type { StoreState } from "@/store/slices";

function migrate(_state: unknown, version: number) {
  const state = _state as Partial<StoreState>;

  if (version < 17 && state.sharing) {
    // The server migration backfilled pre-existing shares to listed = 1, so
    // local state must assume the same — defaulting to unlisted would make
    // the next share update silently unlist them.
    state.sharing.listed ??= Object.fromEntries(
      Object.keys(state.sharing.decks ?? {}).map((id) => [id, true]),
    );
  }

  return state;
}

export default migrate;
