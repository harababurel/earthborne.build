import type { Deck } from "@/store/schemas/deck.schema";

export function isEvolvedDeck(
  deck: Pick<Deck, "rewards" | "displaced" | "maladies">,
) {
  return (
    Object.values(deck.rewards ?? {}).some((q) => q > 0) ||
    Object.values(deck.displaced ?? {}).some((q) => q > 0) ||
    Object.values(deck.maladies ?? {}).some((q) => q > 0)
  );
}
