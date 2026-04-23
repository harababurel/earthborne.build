import { DECK_CARD_COPIES } from "@arkham-build/shared";
import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
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

  initCreate() {
    set((state) => {
      const provider = state.settings.defaultStorageProvider;
      return {
        deckCreate: {
          step: "name",
          name: "New Ranger",
          provider:
            provider === "local" || provider === "shared" ? provider : "local",
          backgroundSlots: {},
          specialtySlots: {},
          personalitySlots: {},
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

  deckCreateSetSpecialty(type) {
    set((state) => {
      assert(state.deckCreate, "DeckCreate slice must be initialized.");
      return {
        deckCreate: {
          ...state.deckCreate,
          specialty: type,
          specialtySlots: {},
          outsideInterestSlots: {},
          roleCode: undefined,
        },
      };
    });
  },

  deckCreateSetRole(code) {
    set((state) => {
      assert(state.deckCreate, "DeckCreate slice must be initialized.");
      return { deckCreate: { ...state.deckCreate, roleCode: code } };
    });
  },

  deckCreateSelectPersonalityCard(code) {
    set((state) => {
      assert(state.deckCreate, "DeckCreate slice must be initialized.");
      const metadata = selectMetadata(state);
      const card = metadata.cards[code];
      const aspect = card?.aspect_requirement_type;
      const current = state.deckCreate.personalitySlots;

      if (current[code]) {
        const nextSlots = { ...current };
        delete nextSlots[code];
        return {
          deckCreate: { ...state.deckCreate, personalitySlots: nextSlots },
        };
      }

      // Select new card, replacing any existing selection for the same aspect.
      const nextSlots: Record<string, number> = {};
      for (const [c, q] of Object.entries(current)) {
        if (metadata.cards[c]?.aspect_requirement_type !== aspect) {
          nextSlots[c] = q;
        }
      }
      nextSlots[code] = DECK_CARD_COPIES;

      return {
        deckCreate: { ...state.deckCreate, personalitySlots: nextSlots },
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
