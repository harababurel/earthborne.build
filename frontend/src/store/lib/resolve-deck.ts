import type { Deck } from "@earthborne-build/shared";
import { isSpecialCard } from "@/utils/card-utils";
import type { StoreState } from "../slices";
import { decodeAnnotations, decodeDeckMeta } from "./deck-meta";
import type { LookupTables } from "./lookup-tables.types";
import { decodeSlots } from "./slots";
import type { DeckSummary, ResolvedDeck } from "./types";

/**
 * Given a decoded deck, resolve all cards and metadata for display.
 */
export function resolveDeck(
  deps: Pick<StoreState, "metadata" | "sharing"> & {
    lookupTables: LookupTables;
  },
  collator: Intl.Collator,
  deck: Deck,
): ResolvedDeck {
  const deckMeta = decodeDeckMeta(deck);

  const { cards, deckSize, charts } = decodeSlots(deps, collator, deck);

  const resolved = {
    ...deck,
    annotations: decodeAnnotations(deckMeta),
    cards,
    originalDeck: deck,
    shared: !!deps.sharing.decks[deck.id],
    stats: {
      deckSize,
      charts,
    },
  } as ResolvedDeck;

  return resolved as ResolvedDeck;
}

export function resolveDeckSummary(
  deps: Pick<StoreState, "metadata" | "sharing">,
  _collator: Intl.Collator,
  deck: Deck,
): DeckSummary {
  const deckSize = computeDeckSize(deps.metadata, deck);

  return {
    date_creation: deck.date_creation,
    date_update: deck.date_update,
    id: deck.id,
    name: deck.name,
    problem: deck.problem,
    source: deck.source,
    tags: deck.tags,
    slots: deck.slots,
    shared: !!deps.sharing.decks[deck.id],
    stats: { deckSize },
    role_code: deck.role_code,
    aspect_code: deck.aspect_code,
  };
}

function computeDeckSize(metadata: StoreState["metadata"], deck: Deck) {
  let deckSize = 0;

  for (const [code, quantity] of Object.entries(deck.slots)) {
    const rawCard = metadata.cards[code];
    if (!rawCard) continue;

    if (!isSpecialCard(rawCard)) {
      deckSize += quantity;
    }
  }

  return deckSize;
}

export function deckTags(deck: Pick<DeckSummary, "tags">, delimiter = " ") {
  return (
    deck.tags
      ?.trim()
      .split(delimiter)
      .filter((x) => x) ?? []
  );
}
