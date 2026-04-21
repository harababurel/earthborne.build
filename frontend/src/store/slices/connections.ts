import type { StateCreator } from "zustand";
import type { StoreState } from ".";
import type { ConnectionsSlice } from "./connections.types";

function getInitialConnectionsState() {
  return {
    data: {},
  };
}

// ArkhamDB-style external deck sync has been removed. The slice is kept only
// so persisted state from older clients still round-trips cleanly; all
// methods are no-ops because no providers are registered.
export const createConnectionsSlice: StateCreator<
  StoreState,
  [],
  [],
  ConnectionsSlice
> = () => ({
  connections: getInitialConnectionsState(),

  async sync() {},

  async unsync() {},

  async uploadDeck(id) {
    return id;
  },
});
