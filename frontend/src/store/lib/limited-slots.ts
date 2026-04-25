// Stub — ER has no deck-option limited-slot system.
import type { Card } from "@earthborne-build/shared";
import type { Interpreter } from "./buildql/interpreter";
import type { ResolvedDeck } from "./types";

// DeckOption stub for call-site compatibility.
type DeckOption = Record<string, unknown>;

export type LimitedSlotOccupation = {
  entries: {
    card: Card;
    quantity: number;
  }[];
  index: number;
  option: DeckOption;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function limitedSlotOccupation(
  _deck: ResolvedDeck,
  _buildQlInterpreter: Interpreter,
): undefined | LimitedSlotOccupation[] {
  return undefined;
}
