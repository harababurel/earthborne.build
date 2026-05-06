import type { Card } from "@earthborne-build/shared";

export function hasLocationBack(card: Card) {
  return !!(
    card.category_id === "location" &&
    (card.back_image_url ||
      card.path_deck_assembly ||
      card.arrival_setup ||
      card.campaign_guide_entry != null)
  );
}
