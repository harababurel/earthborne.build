import { createSelector } from "reselect";
import { and } from "@/utils/fp";
import { isCardOwned } from "../lib/card-ownership";
import { filterPathCards } from "../lib/filtering";
import type { StoreState } from "../slices";
import { selectLookupTables, selectMetadata } from "./shared";

export type Counts = {
  player: number;
  encounter: number;
};

export type CollectionCounts = {
  cycles: Record<string, Counts>;
  packs: Record<string, Counts>;
};

export const selectTotalOwned = createSelector(
  selectMetadata,
  selectLookupTables,
  (state: StoreState) => state.settings.collection,
  (metadata, lookupTables, collection) => {
    const cards = Object.values(metadata.cards);

    let ownedPlayerCards = 0;
    let ownedEncounterCards = 0;

    const filter = and([(c) => !(c as unknown as { hidden?: boolean }).hidden]);

    for (const card of cards) {
      if (!filter(card)) continue;

      const owned = isCardOwned({
        card,
        metadata,
        lookupTables,
        collection,
        showAllCards: false,
      });

      if (owned) {
        const physicalQuantity = card.quantity ?? 0;
        if (filterPathCards(card)) {
          ownedEncounterCards += physicalQuantity;
        } else {
          ownedPlayerCards += physicalQuantity;
        }
      }
    }

    return {
      player: ownedPlayerCards,
      encounter: ownedEncounterCards,
    } as Counts;
  },
);

export const selectCycleCardCounts = createSelector(
  selectMetadata,
  (metadata) => {
    const res: CollectionCounts = {
      cycles: {},
      packs: {},
    };

    for (const card of Object.values(metadata.cards)) {
      const packCode = card.pack_code;
      const isEncounter = filterPathCards(card);

      const pack = metadata.packs[packCode];
      const cycle = metadata.cycles[pack.cycle_code];

      res.packs[packCode] ??= { player: 0, encounter: 0 };
      res.cycles[cycle.code] ??= { player: 0, encounter: 0 };

      const physicalQuantity = card.quantity ?? 0;
      if (isEncounter) {
        res.cycles[cycle.code].encounter += physicalQuantity;
        res.packs[packCode].encounter += physicalQuantity;
      } else {
        res.cycles[cycle.code].player += physicalQuantity;
        res.packs[packCode].player += physicalQuantity;
      }
    }

    if (res.packs["rcore"] && res.packs["core"]) {
      res.packs["rcore"].encounter = res.packs["core"].encounter;
    }

    return res;
  },
);
