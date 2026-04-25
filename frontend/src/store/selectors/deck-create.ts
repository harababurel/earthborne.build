import type { Card } from "@earthborne-build/shared";
import { createSelector } from "reselect";
import { assert } from "@/utils/assert";
import { resolveCardWithRelations } from "../lib/resolve-card";
import type { ResolvedCard } from "../lib/types";
import type { StoreState } from "../slices";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "./shared";

export function selectDeckCreateChecked(state: StoreState) {
  const { deckCreate } = state;
  assert(deckCreate, "DeckCreate slice must be initialized.");
  return deckCreate;
}

export const selectDeckCreateRole = createSelector(
  selectDeckCreateChecked,
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (deckCreate, metadata, lookupTables, collator): ResolvedCard | undefined => {
    if (!deckCreate.roleCode) return undefined;
    return (
      resolveCardWithRelations(
        { metadata, lookupTables },
        collator,
        deckCreate.roleCode,
        true,
      ) ?? undefined
    );
  },
);

export const selectDeckCreateRoleCards = createSelector(
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (_: StoreState, specialty?: string) => specialty,
  (metadata, lookupTables, collator, specialty) =>
    resolveCards(
      { metadata, lookupTables },
      collator,
      (card) => card.type_code === "role" && card.specialty_type === specialty,
    ),
);

export const selectDeckCreateAspectCards = createCardListSelector(
  (card) => card.type_code === "aspect",
);

export const selectDeckCreatePersonalityCards = createCardListSelector(
  (card) => card.category === "personality",
);

export const selectDeckCreateBackgroundCards = createSelector(
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (_: StoreState, background?: string) => background,
  (metadata, lookupTables, collator, background) =>
    resolveCards(
      { metadata, lookupTables },
      collator,
      (card) => !!background && card.background_type === background,
    ),
);

export const selectDeckCreateSpecialtyCards = createSelector(
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (_: StoreState, specialty?: string) => specialty,
  (metadata, lookupTables, collator, specialty) =>
    resolveCards(
      { metadata, lookupTables },
      collator,
      (card) =>
        !!specialty &&
        card.specialty_type === specialty &&
        card.type_code !== "role",
    ),
);

export const selectDeckCreateOutsideInterestCards = createSelector(
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (metadata, lookupTables, collator) =>
    resolveCards({ metadata, lookupTables }, collator, (card) => {
      if (card.is_expert) return false;
      return card.category === "background" || card.category === "specialty";
    }),
);

function createCardListSelector(predicate: (card: Card) => boolean) {
  return createSelector(
    selectMetadata,
    selectLookupTables,
    selectLocaleSortingCollator,
    (metadata, lookupTables, collator) =>
      resolveCards({ metadata, lookupTables }, collator, predicate),
  );
}

function resolveCards(
  deps: Parameters<typeof resolveCardWithRelations>[0],
  collator: Intl.Collator,
  predicate: (card: Card) => boolean,
): ResolvedCard[] {
  return Object.values(deps.metadata.cards)
    .filter(predicate)
    .sort((a, b) => collator.compare(a.name, b.name))
    .map((card) => resolveCardWithRelations(deps, collator, card.code, true))
    .filter((card): card is ResolvedCard => !!card);
}
