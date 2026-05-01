import type { Deck, Id, Slots } from "@earthborne-build/shared";
import type { EditState, Slot } from "../slices/deck-edits.types";
import type { Metadata } from "../slices/metadata.types";
import {
  decodeAnnotations,
  decodeDeckMeta,
  encodeAnnotations,
} from "./deck-meta";
import { type ChangeStats, getChangeStats } from "./deck-upgrades";
import type { Annotations, DeckMeta, ResolvedDeck } from "./types";

/**
 * Given a stored deck, apply deck edits and return a new, serializable deck.
 * This function is inefficient in the context of the deck editor as it parses
 * and encodes the "serialized" deck form to apply edits, which has to be decoded again
 * in the resolver.
 * However, this allows us to re-use this logic to encode the persisted deck to storage upon
 * saving a deck.
 */
export function applyDeckEdits(
  originalDeck: Deck,
  edits: EditState | undefined,
  _metadata: Metadata,
  pruneDeletions = false,
  _previousDeck?: Deck,
) {
  if (!edits) return structuredClone(originalDeck);

  const deck = structuredClone(originalDeck);

  if (edits.name != null) {
    deck.name = edits.name;
  }

  if (edits.role_code) {
    deck.role_code = edits.role_code;
  }

  if (edits.description_md != null) {
    deck.description_md = edits.description_md;
  }

  if (edits.tags != null) {
    deck.tags = edits.tags;
  }

  // adjust quantities based on deck edits.
  for (const [key, quantityEdits] of Object.entries(edits.quantities ?? {})) {
    for (const [code, value] of Object.entries(quantityEdits)) {
      const slotKey = key as Slot;

      if (!deck[slotKey] || Array.isArray(deck[slotKey])) {
        deck[slotKey] = {};
      }

      (deck[slotKey] as Slots)[code] = value;
    }
  }

  for (const [code, quantity] of Object.entries(deck.slots)) {
    if (!quantity && (pruneDeletions || !originalDeck.slots[code])) {
      delete deck.slots[code];
    }
  }

  const annotationEdits = mergeAnnotationEdits(edits, decodeDeckMeta(deck));

  deck.meta = JSON.stringify({
    ...decodeDeckMeta(deck),
    ...annotationEdits,
  });

  return deck;
}

function mergeAnnotationEdits(edits: EditState, deckMeta: DeckMeta) {
  const annotations: Annotations = decodeAnnotations(deckMeta) ?? {};

  for (const [code, annotation] of Object.entries(edits.annotations ?? {})) {
    if (annotation) {
      annotations[code] = annotation;
    } else {
      delete annotations[code];
    }
  }

  return encodeAnnotations(annotations);
}

/**
 * Merges stored customizations in a deck with edits, returning a deck.meta JSON block.
 */

export type ChangeRecord = {
  id: Id;
  stats: ChangeStats;
};

export function getChangeRecord(
  prev: ResolvedDeck,
  next: ResolvedDeck,
  omitUpgradeStats = false,
): ChangeRecord {
  return {
    id: next.id,
    stats: getChangeStats(prev, next, omitUpgradeStats),
  };
}

export function hasQuantityEdits(edits: EditState | undefined) {
  return Object.values(edits?.quantities ?? {}).some(
    (slotEdits) => Object.keys(slotEdits ?? {}).length > 0,
  );
}

export function markDeckbuildingStateEvolved(deck: Deck) {
  deck.meta = JSON.stringify({
    ...decodeDeckMeta(deck),
    deckbuilding_state: "evolved",
  });
}
