import type { Campaign, Card, Id } from "@earthborne-build/shared";
import { createSelector } from "reselect";
import type { StoreState } from "../slices";
import { selectMetadata } from "./shared";

export function selectCampaign(
  state: StoreState,
  id?: Id,
): Campaign | undefined {
  return id != null ? state.data.campaigns[id] : undefined;
}

export const selectCampaigns = createSelector(
  (state: StoreState) => state.data.campaigns,
  (campaigns): Campaign[] =>
    Object.values(campaigns).sort((a, b) =>
      b.date_update.localeCompare(a.date_update),
    ),
);

// Location-type cards keyed by name, for previewing a location card on hover.
// Keeps the representative (lowest set_position) when a name repeats.
export const selectLocationCardsByName = createSelector(
  (state: StoreState) => selectMetadata(state).cards,
  (cards): Record<string, Card> => {
    const byName: Record<string, Card> = {};
    for (const card of Object.values(cards)) {
      if (card.type_code !== "location") continue;
      const existing = byName[card.name];
      if (
        !existing ||
        Number(card.set_position ?? 0) < Number(existing.set_position ?? 0)
      ) {
        byName[card.name] = card;
      }
    }
    return byName;
  },
);

// Reverse lookup powering deck↔campaign reward sync without touching DeckSchema.
export function selectCampaignForDeck(
  state: StoreState,
  deckId?: Id,
): Campaign | undefined {
  if (deckId == null) return undefined;
  return Object.values(state.data.campaigns).find((campaign) =>
    campaign.deck_ids.includes(deckId),
  );
}
