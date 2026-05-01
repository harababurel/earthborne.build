import type { Deck } from "@earthborne-build/shared";

export function isEvolvedDeck(
  deck: Pick<Deck, "rewards" | "displaced" | "maladies"> & {
    meta?: string | null;
  },
) {
  return (
    hasEvolvedDeckbuildingState(deck.meta) ||
    Object.values(deck.rewards ?? {}).some((q) => q > 0) ||
    Object.values(deck.displaced ?? {}).some((q) => q > 0) ||
    Object.values(deck.maladies ?? {}).some((q) => q > 0)
  );
}

function hasEvolvedDeckbuildingState(meta: string | null | undefined) {
  if (!meta) return false;

  try {
    const parsed = JSON.parse(meta) as Record<string, unknown>;
    return (
      typeof parsed === "object" &&
      parsed != null &&
      parsed.deckbuilding_state === "evolved"
    );
  } catch {
    return false;
  }
}
