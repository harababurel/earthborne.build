import type { Card } from "@arkham-build/shared";

import type { Annotations } from "../lib/types";
import type { Id } from "../schemas/deck.schema";

export type Slot = "slots";

export function mapTabToSlot(_tab: string): Slot {
  return "slots";
}

export type EditState = {
  description_md?: string | null;
  role_code?: string;
  name?: string | null;
  quantities?: {
    slots?: Record<string, number>;
  };
  annotations?: Annotations;
  tags?: string | null;
  /** The type of an edit determines whether a notification is shown on load. */
  type?: "system" | "user";
};

type EditsState = {
  [id: Id]: EditState;
};

export type DeckEditsSlice = {
  deckEdits: EditsState;

  createEdit(deckId: Id, edit: Partial<EditState>): void;

  discardEdits(deckId: Id): void;

  completeTask(deckId: Id, card: Card): string;

  updateCardQuantity(
    deckId: Id,
    code: string,
    quantity: number,
    limit: number,
    slot?: Slot,
    mode?: "increment" | "set",
  ): void;

  updateInvestigatorCode(deckId: Id, code: string): void;

  updateName(deckId: Id, value: string): void;

  updateDescription(deckId: Id, value: string): void;

  updateTags(deckId: Id, value: string): void;

  updateAnnotation(deckId: Id, code: string, value: string | null): void;
};
