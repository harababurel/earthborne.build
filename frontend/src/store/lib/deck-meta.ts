import type { Deck } from "@arkham-build/shared";
import type { Annotations, DeckMeta } from "./types";

export function decodeDeckMeta(deck: Deck): DeckMeta {
  try {
    const metaJson = JSON.parse(deck.meta);
    return typeof metaJson === "object" && metaJson != null ? metaJson : {};
  } catch {
    return {};
  }
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
