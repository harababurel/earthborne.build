import type { Id } from "@earthborne-build/shared";
import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import { displayAttribute } from "@/utils/card-utils";
import { dehydrate } from "../persist";
import { selectResolvedDeckById } from "../selectors/decks";
import type { StoreState } from ".";
import {
  type DeckEditsSlice,
  mapTabToSlot,
  type Slot,
} from "./deck-edits.types";

function currentEdits(state: StoreState, deckId: Id) {
  return state.deckEdits[deckId] ?? {};
}

export const createDeckEditsSlice: StateCreator<
  StoreState,
  [],
  [],
  DeckEditsSlice
> = (set, get) => ({
  deckEdits: {},

  createEdit(deckId, edit) {
    set((state) => {
      return {
        deckEdits: {
          ...state.deckEdits,
          [deckId]: edit,
        },
      };
    });

    dehydrate(get(), "edits").catch(console.error);
  },

  discardEdits(deckId) {
    set((state) => {
      const deckEdits = { ...state.deckEdits };
      delete deckEdits[deckId];
      return { deckEdits };
    });
    dehydrate(get(), "edits").catch(console.error);
  },
  updateInvestigatorCode(deckId, code) {
    set((state) => ({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...currentEdits(state, deckId),
          role_code: code,
          type: "user" as const,
        },
      },
    }));

    dehydrate(get(), "edits").catch(console.error);
  },
  updateCardQuantity(deckId, code, quantity, limit, tab, mode = "increment") {
    set((state) =>
      getCardQuantityUpdate(state, deckId, code, quantity, limit, tab, mode),
    );
    dehydrate(get(), "edits").catch(console.error);
  },
  updateDescription(deckId, value) {
    set((state) => ({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...currentEdits(state, deckId),
          description_md: value,
          type: "user" as const,
        },
      },
    }));

    dehydrate(get(), "edits").catch(console.error);
  },
  updateName(deckId, value) {
    set((state) => ({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...currentEdits(state, deckId),
          name: value,
          type: "user" as const,
        },
      },
    }));

    dehydrate(get(), "edits").catch(console.error);
  },
  updateTags(deckId, value) {
    set((state) => ({
      deckEdits: {
        ...state.deckEdits,
        [deckId]: {
          ...currentEdits(state, deckId),
          tags: value,
          type: "user" as const,
        },
      },
    }));

    dehydrate(get(), "edits").catch(console.error);
  },

  updateAnnotation(deckId, code, value) {
    set((state) => {
      const edits = currentEdits(state, deckId);
      return {
        deckEdits: {
          ...state.deckEdits,
          [deckId]: {
            ...edits,
            annotations: {
              ...edits.annotations,
              [code]: value,
            },
            type: "user" as const,
          },
        },
      };
    });

    dehydrate(get(), "edits").catch(console.error);
  },

  unlockReward(deckId, cardCode) {
    set((state) =>
      setQuantityEdits(state, deckId, { rewards: { [cardCode]: 1 } }),
    );
    dehydrate(get(), "edits").catch(console.error);
  },

  removeUnlockedReward(deckId, cardCode) {
    set((state) =>
      setQuantityEdits(state, deckId, { rewards: { [cardCode]: 0 } }),
    );
    dehydrate(get(), "edits").catch(console.error);
  },

  swapRewardIntoSlots(deckId, rewardCode, displacedCode) {
    set((state) =>
      setQuantityEdits(state, deckId, {
        rewards: { [rewardCode]: 0 },
        slots: { [rewardCode]: 2, [displacedCode]: 0 },
        displaced: { [displacedCode]: 2 },
      }),
    );
    dehydrate(get(), "edits").catch(console.error);
  },

  restoreDisplaced(deckId, displacedCode, outCode) {
    set((state) =>
      setQuantityEdits(state, deckId, {
        displaced: {
          [displacedCode]: 0,
          ...(outCode ? { [outCode]: 2 } : {}),
        },
        slots: {
          [displacedCode]: 2,
          ...(outCode ? { [outCode]: 0 } : {}),
        },
      }),
    );
    dehydrate(get(), "edits").catch(console.error);
  },

  addMalady(deckId, cardCode) {
    set((state) =>
      setQuantityEdits(state, deckId, { maladies: { [cardCode]: 1 } }),
    );
    dehydrate(get(), "edits").catch(console.error);
  },

  removeMalady(deckId, cardCode) {
    set((state) =>
      setQuantityEdits(state, deckId, { maladies: { [cardCode]: 0 } }),
    );
    dehydrate(get(), "edits").catch(console.error);
  },

  completeTask(deckId, card) {
    assert(
      card.traits?.includes("Task"),
      `${displayAttribute(card, "name")} is not a Task.`,
    );

    const completeId = `${card.code.slice(0, -1)}b`;

    set((state) => {
      let nextState = getCardQuantityUpdate(
        state,
        deckId,
        card.code,
        0,
        1,
        "slots",
        "set",
      );

      nextState = getCardQuantityUpdate(
        { ...state, ...nextState },
        deckId,
        completeId,
        1,
        1,
        "slots",
        "set",
      );

      return nextState;
    });

    dehydrate(get(), "edits").catch(console.error);
    return completeId;
  },
});

function getCardQuantityUpdate(
  state: StoreState,
  deckId: Id,
  code: string,
  quantity: number,
  limit: number,
  tab?: Slot,
  mode: "increment" | "set" = "increment",
  type: "system" | "user" = "user",
) {
  const edits = currentEdits(state, deckId);

  const targetTab = tab || "slots";
  const slot = mapTabToSlot(targetTab);

  const deck = selectResolvedDeckById(state, deckId, true);
  assert(deck, `Tried to edit deck that does not exist: ${deckId}`);

  const current = deck[slot]?.[code] ?? 0;

  const newValue =
    mode === "increment"
      ? Math.min(Math.max(current + quantity, 0), limit)
      : Math.max(Math.min(quantity, limit), 0);

  const nextState: Partial<StoreState> = {
    deckEdits: {
      ...state.deckEdits,
      [deckId]: {
        ...edits,
        quantities: {
          ...edits.quantities,
          [slot]: {
            ...edits.quantities?.[slot],
            [code]: newValue,
          },
        },
        type,
      },
    },
  };

  return nextState;
}

function setQuantityEdits(
  state: StoreState,
  deckId: Id,
  quantities: Partial<Record<Slot, Record<string, number>>>,
): Partial<StoreState> {
  const edits = currentEdits(state, deckId);
  const nextQuantities = { ...edits.quantities };

  for (const [slot, changes] of Object.entries(quantities)) {
    const slotKey = slot as Slot;
    nextQuantities[slotKey] = {
      ...nextQuantities[slotKey],
      ...changes,
    };
  }

  return {
    deckEdits: {
      ...state.deckEdits,
      [deckId]: {
        ...edits,
        quantities: nextQuantities,
        type: "user" as const,
      },
    },
  };
}
