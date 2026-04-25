import type { Card } from "@earthborne-build/shared";
import type { Metadata } from "../slices/metadata.types";
import type { LookupTables } from "./lookup-tables.types";

export type CardOwnershipOptions = {
  card: Card;
  metadata: Metadata;
  lookupTables: LookupTables;
  collection: Record<string, boolean>;
  showAllCards?: boolean;
  strict?: boolean;
};

export function isCardOwned(options: CardOwnershipOptions): boolean {
  const { card, metadata, lookupTables, collection, showAllCards, strict } =
    options;

  // In ER, fan-made cards have pack_code starting with "fan_".
  const isFanMade = card.pack_code?.startsWith("fan_");
  if (isFanMade && !strict) return true;

  if (!isFanMade && showAllCards) return true;

  // direct pack ownership.
  if (collection[card.pack_code]) {
    return true;
  }

  const duplicates = lookupTables.relations.duplicates[card.code];
  if (!duplicates) return false;

  for (const code of Object.keys(duplicates ?? {})) {
    const duplicate = metadata.cards[code];

    if (!duplicate) {
      continue;
    }

    const packCode = duplicate.pack_code;
    if (packCode && collection[packCode]) return true;
  }

  return false;
}
