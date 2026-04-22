import { createSelector } from "reselect";
import { resolveCardWithRelations } from "../lib/resolve-card";
import type { ResolvedDeck } from "../lib/types";
import type { StoreState } from "../slices";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "./shared";

export const selectCardWithRelations = createSelector(
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (_: StoreState, code: string) => code,
  (_: StoreState, __: string, withRelations: boolean) => withRelations,
  (_: StoreState, __: string, ___, resolvedDeck: ResolvedDeck) => resolvedDeck,
  (metadata, lookupTables, collator, code, withRelations, _resolvedDeck) =>
    resolveCardWithRelations(
      { metadata, lookupTables },
      collator,
      code,
      withRelations,
    ),
);
