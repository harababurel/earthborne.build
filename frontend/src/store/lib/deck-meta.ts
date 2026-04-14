import type { SealedDeckResponse } from "@arkham-build/shared";
import type { Deck, Slots } from "@/store/schemas/deck.schema";
import type { AttachmentQuantities } from "@/store/slices/deck-edits.types";
import type { Metadata } from "@/store/slices/metadata.types";
import { range } from "@/utils/range";
import type {
  Annotations,
  Customizations,
  DeckMeta,
} from "./types";

export function decodeDeckMeta(deck: Deck): DeckMeta {
  try {
    const metaJson = JSON.parse(deck.meta);
    return typeof metaJson === "object" && metaJson != null ? metaJson : {};
  } catch {
    return {};
  }
}

/**
 * ER has no investigator deck_options / side_deck_options.
 * This is a no-op stub kept for call-site compatibility.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function decodeSelections(_investigator: unknown, _deckMeta: DeckMeta) {
  return undefined;
}

/**
 * ER has no customization system.
 * This is a no-op stub kept for call-site compatibility.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function decodeCustomizations(_deckMeta: DeckMeta, _metadata: Metadata): Customizations | undefined {
  return undefined;
}

/**
 * ER has no customization system.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function encodeCustomizations(_customizations: Customizations) {
  return {};
}

export function decodeAttachments(deckMeta: DeckMeta) {
  let hasAttachments = false;
  const attachments: AttachmentQuantities = {};

  for (const [key, value] of Object.entries(deckMeta)) {
    if (key.startsWith("attachments_") && value) {
      hasAttachments = true;

      const code = key.split("attachments_")[1];

      attachments[code] = (value as string)
        .split(",")
        .reduce<Record<string, number>>((acc, curr) => {
          acc[curr] ??= 0;
          acc[curr] += 1;
          return acc;
        }, {});
    }
  }

  return hasAttachments ? attachments : undefined;
}

export function encodeAttachments(attachments: AttachmentQuantities) {
  return Object.entries(attachments).reduce<Record<string, string | null>>(
    (acc, [targetCode, attachments]) => {
      const entries = Object.entries(attachments).reduce<string[]>(
        (acc, [code, quantity]) => {
          if (quantity > 0) {
            for (const _ of range(0, quantity)) {
              acc.push(code);
            }
          }

          return acc;
        },
        [],
      );

      acc[`attachments_${targetCode}`] = entries.length
        ? entries.join(",")
        : null;
      return acc;
    },
    {},
  );
}

/**
 * ER has no card pool extension mechanic.
 */
export function decodeCardPoolFromSlots(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _slots: Slots,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _metadata: Metadata,
  deckMeta: DeckMeta,
) {
  const pool = deckMeta.card_pool?.split(",");
  if (!pool?.length) return undefined;
  return pool;
}

export function encodeCardPool(cardPool: string[]) {
  return cardPool.filter((x) => x).join(",");
}

export function decodeSealedDeck(deckMeta: DeckMeta) {
  const entries = deckMeta.sealed_deck?.split(",");

  if (!entries?.length) return undefined;

  const cards = entries.reduce<Record<string, number>>((acc, curr) => {
    const [code, quantity] = curr.split(":");
    acc[code] = Number.parseInt(quantity, 10);
    return acc;
  }, {});

  return {
    name: deckMeta.sealed_deck_name ?? "Sealed Deck",
    cards,
  };
}

export function encodeSealedDeck(sealed: SealedDeckResponse) {
  return {
    sealed_deck: Object.entries(sealed.cards)
      .map(([code, quantity]) => `${code}:${quantity}`)
      .join(","),
    sealed_deck_name: sealed.name,
  };
}

export function decodeAnnotations(deckMeta: DeckMeta): Annotations {
  const annotations: Annotations = {};

  for (const [key, value] of Object.entries(deckMeta)) {
    if (key.startsWith("annotation_") && value) {
      const code = key.split("annotation_")[1];
      annotations[code] = value as string;
    }
  }

  return annotations;
}

export function encodeAnnotations(annotations: Annotations) {
  return Object.entries(annotations).reduce<Annotations>(
    (acc, [code, note]) => {
      if (note) acc[`annotation_${code}`] = note;
      return acc;
    },
    {},
  );
}
