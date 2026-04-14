import type { Card } from "@arkham-build/shared";
import { displayAttribute } from "@/utils/card-utils";
import { fuzzyMatch, prepareNeedle } from "@/utils/fuzzy";
import type { Search } from "../slices/lists.types";
import type { Metadata } from "../slices/metadata.types";

function prepareCardFace(card: Card, search: Search) {
  const needle: string[] = [];

  if (search.includeName) {
    needle.push(displayAttribute(card, "name"));
  }

  if (search.includeGameText) {
    if (card.traits) needle.push(displayAttribute(card, "traits"));
    if (card.text) needle.push(displayAttribute(card, "text"));
  }

  if (search.includeFlavor) {
    if (card.flavor) needle.push(displayAttribute(card, "flavor"));
  }

  return needle;
}

function prepareCardBack(card: Card, search: Search) {
  // ER double-sided cards reuse the same text fields for both faces.
  return prepareCardFace(card, search);
}

export function applySearch(
  search: Search,
  cards: Card[],
  metadata: Metadata,
): Card[] {
  if (metadata.cards[search.value]) {
    return cards.filter((card) => card.code === search.value);
  }

  const needle = prepareNeedle(search.value);
  if (!needle) return cards;

  return cards.filter((card) => {
    const content = prepareCardFace(card, search);

    if (search.includeBacks && card.double_sided) {
      content.push(...prepareCardBack(card, search));
    }

    return fuzzyMatch(content, needle);
  });
}
