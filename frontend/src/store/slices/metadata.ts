import type { StateCreator } from "zustand";
import type { StoreState } from ".";
import type { Metadata, MetadataSlice } from "./metadata.types";

export function getInitialMetadata(): Metadata {
  return {
    dataVersion: undefined,
    cards: {},
    packs: {},
    // AH-specific fields — always empty for ER.
    encounterSets: {},
    cycles: {},
    factions: {},
    types: {},
  };
}

export const createMetadataSlice: StateCreator<
  StoreState,
  [],
  [],
  MetadataSlice
> = () => ({
  metadata: getInitialMetadata(),
});
