import { DECK_CARD_COPIES, PERSONALITY_PICKS } from "@arkham-build/shared";
import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import { displayAttribute } from "@/utils/card-utils";
import { getDefaultDeckName } from "../lib/deck-factory";
import { selectMetadata } from "../selectors/shared";
import type { StoreState } from ".";
import type { DeckCreateSlice, DeckCreateStep } from "./deck-create.types";

export const createDeckCreateSlice: StateCreator<
  StoreState,
  [],
  [],
  DeckCreateSlice
> = (set) => ({
  deckCreate: undefined,

  initCreate(code: string) {
    set((state) => {
      const metadata = selectMetadata(state);
      const role = metadata.cards[code];
      assert(
        role && role.type_code === "role",
        "Deck configure must be initialized with a role card.",
      );

      const provider = state.settings.defaultStorageProvider;
      const personalitySlots = Object.values(metadata.cards)
        .filter((card) => card.category === "personality")
        .slice(0, PERSONALITY_PICKS)
        .reduce<Record<string, number>>((acc, card) => {
          acc[card.code] = DECK_CARD_COPIES;
          return acc;
        }, {});

      return {
        deckCreate: {
          step: "name",
          name: getDefaultDeckName(
            displayAttribute(role, "name"),
            role.energy_aspect ?? "",
          ),
          provider:
            provider === "local" || provider === "shared" ? provider : "local",
          roleCode: role.code,
          backgroundSlots: {},
          specialtySlots: {},
          personalitySlots,
          outsideInterestSlots: {},
        },
      };
    });
  },

  resetCreate() {
    set({ deckCreate: undefined });
  },

  deckCreateSetStep(step: DeckCreateStep) {
    set((state) => {
      assert(state.deckCreate, "DeckCreate slice must be initialized.");
      return { deckCreate: { ...state.deckCreate, step } };
    });
  },

  deckCreateSetName(value: string) {
    set((state) => {
      assert(state.deckCreate, "DeckCreate slice must be initialized.");
      return { deckCreate: { ...state.deckCreate, name: value } };
    });
  },

  deckCreateSetProvider(provider) {
    set((state) => {
      assert(state.deckCreate, "DeckCreate slice must be initialized.");
      return { deckCreate: { ...state.deckCreate, provider } };
    });
  },

  deckCreateSetAspect(code) {
    set((state) => {
      assert(state.deckCreate, "DeckCreate slice must be initialized.");
      return { deckCreate: { ...state.deckCreate, aspectCode: code } };
    });
  },

  deckCreateSetBackground(type) {
    set((state) => {
      assert(state.deckCreate, "DeckCreate slice must be initialized.");
      return {
        deckCreate: {
          ...state.deckCreate,
          background: type,
          backgroundSlots: {},
          outsideInterestSlots: {},
        },
      };
    });
  },

  deckCreateToggleBackgroundCard(code) {
    set((state) => toggleSlot(state, "backgroundSlots", code, 5));
  },

  deckCreateToggleSpecialtyCard(code) {
    set((state) => toggleSlot(state, "specialtySlots", code, 5));
  },

  deckCreateToggleOutsideInterest(code) {
    set((state) => {
      assert(state.deckCreate, "DeckCreate slice must be initialized.");
      const selected = state.deckCreate.outsideInterestSlots[code];
      return {
        deckCreate: {
          ...state.deckCreate,
          outsideInterestSlots: selected ? {} : { [code]: DECK_CARD_COPIES },
        },
      };
    });
  },
});

type SlotGroup = "backgroundSlots" | "specialtySlots" | "outsideInterestSlots";

function toggleSlot(
  state: StoreState,
  group: SlotGroup,
  code: string,
  limit: number,
) {
  assert(state.deckCreate, "DeckCreate slice must be initialized.");

  const slots = state.deckCreate[group];
  const selected = !!slots[code];
  const selectedCount = Object.values(slots).filter((q) => q > 0).length;

  if (!selected && selectedCount >= limit) {
    return { deckCreate: state.deckCreate };
  }

  const nextSlots = { ...slots };
  if (selected) {
    delete nextSlots[code];
  } else {
    nextSlots[code] = DECK_CARD_COPIES;
  }

  return {
    deckCreate: {
      ...state.deckCreate,
      [group]: nextSlots,
    },
  };
}
