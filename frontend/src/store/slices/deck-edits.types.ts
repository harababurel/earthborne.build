import type { Card, Id } from "@arkham-build/shared";
import type { Annotations } from "../lib/types";

export type Slot = "slots" | "rewards" | "displaced" | "maladies";

export function mapTabToSlot(tab: string): Slot {
  if (tab === "rewards" || tab === "displaced" || tab === "maladies") {
    return tab;
  }
  return "slots";
}

export type EditState = {
  description_md?: string | null;
  role_code?: string;
  name?: string | null;
  quantities?: {
    slots?: Record<string, number>;
    rewards?: Record<string, number>;
    displaced?: Record<string, number>;
    maladies?: Record<string, number>;
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

  unlockReward(deckId: Id, cardCode: string): void;

  removeUnlockedReward(deckId: Id, cardCode: string): void;

  swapRewardIntoSlots(
    deckId: Id,
    rewardCode: string,
    displacedCode: string,
  ): void;

  restoreDisplaced(deckId: Id, displacedCode: string, outCode?: string): void;

  addMalady(deckId: Id, cardCode: string): void;

  removeMalady(deckId: Id, cardCode: string): void;

  updateName(deckId: Id, value: string): void;

  updateDescription(deckId: Id, value: string): void;

  updateTags(deckId: Id, value: string): void;

  updateAnnotation(deckId: Id, code: string, value: string | null): void;
};
