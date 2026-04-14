import type { Attachments } from "@/store/lib/types";
import type { Deck } from "@/store/schemas/deck.schema";
import type { AttachmentQuantities } from "../slices/deck-edits.types";
import type { Metadata } from "../slices/metadata.types";

export function getAttachableCards(deck: Deck, metadata: Metadata) {
  const attachableCards: Record<string, Attachments> = {};

  const slots = {
    ...deck.slots,
    [deck.investigator_code]: 1,
  };

  for (const [code, quantity] of Object.entries(slots)) {
    if (quantity > 0) {
      const card = metadata.cards[code];
      const cardAny = card as unknown as { attachments?: Attachments };
      if (cardAny?.attachments) {
        attachableCards[code] = cardAny.attachments;
      }
    }
  }

  return attachableCards;
}

export function clampAttachmentQuantity(
  edits: AttachmentQuantities | undefined,
  attachments: AttachmentQuantities,
  code: string,
  inDeck: number,
) {
  const next = structuredClone(edits ?? {});

  let totalCount = 0;

  for (const [targetCode, entries] of Object.entries(attachments)) {
    for (const [attachmentCode, quantity] of Object.entries(entries)) {
      if (attachmentCode === code) {
        if (quantity + totalCount >= inDeck) {
          const attached = Math.max(0, inDeck - totalCount);
          totalCount += attached;
          next[targetCode] ??= {};
          next[targetCode][attachmentCode] = attached;
        } else {
          totalCount += quantity;
        }
      }
    }
  }

  return next;
}
