import type { StoreState } from "../../slices";

function migrate(state: Partial<StoreState>, version: number) {
  if (version < 9) {
    // Clear metadata to ensure we get the latest ER data and no stale AH codes like "core".
    if (state.metadata) {
      state.metadata.cards = {};
      state.metadata.packs = {};
      state.metadata.encounterSets = {};
      state.metadata.cycles = {};
      state.metadata.dataVersion = undefined;
    }
  }

  return state;
}

export default migrate;
