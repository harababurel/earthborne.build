import type { Campaign, Id } from "@earthborne-build/shared";
import { createSelector } from "reselect";
import type { StoreState } from "../slices";

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
