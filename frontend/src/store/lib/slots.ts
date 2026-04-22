import type { Deck } from "@arkham-build/shared";
import { isSpecialCard } from "@/utils/card-utils";
import type { StoreState } from "../slices";
import { addCardToDeckCharts, emptyDeckCharts } from "./deck-charts";
import type { LookupTables } from "./lookup-tables.types";
import { resolveCardWithRelations } from "./resolve-card";
import type { DeckCharts, ResolvedDeck } from "./types";

export function decodeSlots(
  deps: Pick<StoreState, "metadata"> & {
    lookupTables: LookupTables;
  },
  collator: Intl.Collator,
  deck: Deck,
) {
  const cards: ResolvedDeck["cards"] = {
    slots: {},
  };

  let deckSize = 0;
  let deckSizeTotal = 0;

  const charts: DeckCharts = emptyDeckCharts();

  for (const [code, quantity] of Object.entries(deck.slots)) {
    const card = resolveCardWithRelations(deps, collator, code, true);

    if (card) {
      deckSizeTotal += quantity;
      cards.slots[code] = card;

      if (!isSpecialCard(card.card)) {
        deckSize += quantity;
      }

      addCardToDeckCharts(card.card, quantity, charts);
    }
  }

  return {
    cards,
    deckSize,
    deckSizeTotal,
    charts,
  };
}
