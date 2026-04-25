import type { Card, Id } from "@arkham-build/shared";
import { createSelector } from "reselect";
import { resolveDeck, resolveDeckSummary } from "@/store/lib/resolve-deck";
import { time, timeEnd } from "@/utils/time";
import { applyCardChanges } from "../lib/card-edits";
import {
  applyDeckEdits,
  type ChangeRecord,
  getChangeRecord,
} from "../lib/deck-edits";
import { groupDeckCards } from "../lib/deck-grouping";
import type { ChangeStats } from "../lib/deck-upgrades";
import {
  type CardNotInLimitedPoolError,
  type DeckValidationError,
  type DeckValidationResult,
  type ForbiddenCardError,
  type ValidationError,
  validateDeck,
} from "../lib/deck-validation";
import { limitedSlotOccupation } from "../lib/limited-slots";
import { makeSortFunction, sortAlphabeticalLatin } from "../lib/sorting";
import type { DeckSummary, ResolvedDeck } from "../lib/types";
import type { StoreState } from "../slices";
import type { DecklistConfig } from "../slices/settings.types";
import {
  selectBuildQlInterpreter,
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "./shared";

export const selectResolvedDeckById = createSelector(
  selectMetadata,
  selectLookupTables,
  (state: StoreState) => state.sharing,
  selectLocaleSortingCollator,
  (state: StoreState, deckId?: Id) =>
    deckId ? state.data.decks[deckId] : undefined,
  (state: StoreState, deckId?: Id, applyEdits?: boolean) =>
    deckId && applyEdits ? state.deckEdits?.[deckId] : undefined,
  (metadata, lookupTables, sharing, collator, deck, edits) => {
    if (!deck) return undefined;

    time("select_resolved_deck");

    const resolvedDeck = resolveDeck(
      { metadata, lookupTables, sharing },
      collator,
      edits ? applyDeckEdits(deck, edits, metadata) : deck,
    );

    timeEnd("select_resolved_deck");
    return resolvedDeck;
  },
);

export const selectLocalDeckSummaries = createSelector(
  (state: StoreState) => state.data,
  selectMetadata,
  selectLookupTables,
  (state: StoreState) => state.sharing,
  selectLocaleSortingCollator,
  (data, metadata, _lookupTables, sharing, collator) => {
    time("select_local_deck_summaries");

    const summaries = Object.keys(data.history).reduce<DeckSummary[]>(
      (acc, id) => {
        const deck = data.decks[id];

        try {
          if (deck) {
            acc.push(resolveDeckSummary({ metadata, sharing }, collator, deck));
          } else {
            console.warn(`Could not find deck ${id} in local storage.`);
          }
        } catch (err) {
          console.error(`Error resolving deck summary ${id}: ${err}`);
        }

        return acc;
      },
      [],
    );

    summaries.sort((a, b) =>
      sortAlphabeticalLatin(b.date_update, a.date_update),
    );

    timeEnd("select_local_deck_summaries");
    return summaries;
  },
);

export const selectDeckValid = createSelector(
  (_: StoreState, deck: ResolvedDeck | undefined) => deck,
  selectLookupTables,
  selectMetadata,
  selectBuildQlInterpreter,
  (deck, lookupTables, metadata, buildQlInterpreter) => {
    return deck
      ? validateDeck(deck, metadata, lookupTables, buildQlInterpreter)
      : { valid: false, errors: [] };
  },
);

function findErrorByType(
  deckValidation: DeckValidationResult,
  type: ValidationError,
) {
  return deckValidation.errors.find(
    (x: DeckValidationError) => x.type === type,
  );
}

export const selectForbiddenCards = createSelector(
  selectDeckValid,
  (deckValidation) => {
    const forbidden = findErrorByType(deckValidation, "FORBIDDEN");
    if (!forbidden) return [];
    return (forbidden as ForbiddenCardError).details;
  },
);

export const selectCardsNotInLimitedPool = createSelector(
  selectDeckValid,
  (deckValidation) => {
    const cnilp = findErrorByType(deckValidation, "CARD_NOT_IN_LIMITED_POOL");
    if (!cnilp) return [];
    return (cnilp as CardNotInLimitedPoolError).details;
  },
);

export type SlotUpgrade = {
  diff: number;
  card: Card;
};

export type HistoryEntry = ChangeStats & {
  differences: {
    slots: SlotUpgrade[];
  };
  id: Id;
};

export type History = HistoryEntry[];

function diffSortingFn(fallback: (a: Card, b: Card) => number) {
  return (a: SlotUpgrade, b: SlotUpgrade) => {
    const aPos = a.diff > 0;
    const bPos = b.diff > 0;
    if (aPos && !bPos) return -1;
    if (!aPos && bPos) return 1;
    return fallback(a.card, b.card);
  };
}

function getHistoryEntry(
  changes: ChangeRecord,
  metadata: StoreState["metadata"],
  collator: Intl.Collator,
): HistoryEntry {
  const { id, stats } = changes;

  const sortFn = makeSortFunction(["name"], metadata, collator);
  const sortDiff = diffSortingFn(sortFn);

  const differences = {
    slots: Object.entries(stats.changes.slots)
      .map(([code, diff]) => ({
        diff,
        card: applyCardChanges(metadata.cards[code], metadata, undefined),
      }))
      .sort(sortDiff),
  };

  return {
    id,
    ...stats,
    differences,
  };
}

export const selectLimitedSlotOccupation = createSelector(
  (_: StoreState, deck: ResolvedDeck) => deck,
  selectBuildQlInterpreter,
  (deck, buildQlInterpreter) => {
    time("limited_slot_occupation");
    const value = limitedSlotOccupation(deck, buildQlInterpreter);
    timeEnd("limited_slot_occupation");
    return value;
  },
);

export const selectDeckGroups = createSelector(
  selectMetadata,
  selectLocaleSortingCollator,
  (_: StoreState, deck: ResolvedDeck) => deck,
  (_: StoreState, __: ResolvedDeck, listConfig: DecklistConfig) => listConfig,
  (metadata, collator, deck, listConfig) =>
    groupDeckCards(metadata, collator, listConfig, deck),
);

export const selectUndoHistory = createSelector(
  selectMetadata,
  selectLookupTables,
  (state: StoreState) => state.sharing,
  (state: StoreState) => state.data,
  selectLocaleSortingCollator,
  (_: StoreState, deck: ResolvedDeck) => deck,
  (metadata, lookupTables, sharing, data, collator, deck) => {
    const prevDeck = data.decks[deck.id];
    if (!prevDeck) return [];

    const prev = resolveDeck(
      { metadata, lookupTables: lookupTables, sharing },
      collator,
      prevDeck,
    );

    const current = {
      data: getHistoryEntry(
        getChangeRecord(prev, deck, true),
        metadata,
        collator,
      ),
      dateUpdate: new Date().toISOString(),
    };

    if (!data.undoHistory?.[deck.id]) return [current];

    const history = data.undoHistory?.[deck.id].map((undoEntry) => ({
      data: getHistoryEntry(undoEntry.changes, metadata, collator),
      dateUpdate: undoEntry.date_update,
    }));

    return [current, ...history.reverse()];
  },
);
