import { createSelector } from "reselect";
import { assert } from "@/utils/assert";
import { formatRelationTitle } from "@/utils/formatting";
import { resolveCardWithRelations } from "../lib/resolve-card";
import type { CardSet, CardWithRelations } from "../lib/types";
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

export const selectDeckCreateInvestigators = createSelector(
  selectDeckCreateChecked,
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (deckCreate, metadata, lookupTables, collator) => {
    return Object.entries({
      investigator: deckCreate.investigatorCode,
      back: deckCreate.investigatorBackCode,
      front: deckCreate.investigatorFrontCode,
    }).reduce(
      (acc, [key, code]) => {
        const card = resolveCardWithRelations(
          { metadata, lookupTables },
          collator,
          code,
          true,
        );

        assert(card, `${key} card must be resolved.`);

        acc[key] = card;
        return acc;
      },
      {} as Record<string, CardWithRelations>,
    );
  },
);

export const selectDeckCreateCardSets = createSelector(
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  selectDeckCreateChecked,
  selectDeckCreateInvestigators,
  (_metadata, _lookupTables, _collator, _deckCreate, investigators) => {
    const groupings: CardSet[] = [];

    const { back } = investigators;
    const { relations } = back;

    if (relations?.bound?.length) {
      groupings.push({
        id: "bound",
        title: formatRelationTitle("bound"),
        canSelect: false,
        selected: false,
        cards: relations.bound,
        quantities: relations.bound.reduce(
          (acc, { card }) => {
            acc[card.code] = card.quantity;
            return acc;
          },
          {} as Record<string, number>,
        ),
      });
    }

    return groupings;
  },
);
