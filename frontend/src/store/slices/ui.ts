import type { StateCreator } from "zustand";
import type { StoreState } from ".";
import type { UISlice, UIState } from "./ui.types";

function getInitialUIState(): UIState {
  return {
    ui: {
      initialized: false,
      showUnusableCards: false,
      showLimitedAccess: true,
      navigationHistory: [],
      cardModal: {
        code: undefined,
        config: undefined,
      },
    },
  };
}

export const createUISlice: StateCreator<StoreState, [], [], UISlice> = (
  set,
) => ({
  ...getInitialUIState(),
  setShowUnusableCards(showUnusableCards: boolean) {
    set((state) => ({ ui: { ...state.ui, showUnusableCards } }));
  },
  setShowLimitedAccess(showLimitedAccess: boolean) {
    set((state) => ({ ui: { ...state.ui, showLimitedAccess } }));
  },
  pushHistory(path: string) {
    set((state) => {
      if (state.ui.navigationHistory.at(-1) === path) {
        return state;
      }

      return {
        ui: {
          ...state.ui,
          navigationHistory: [...state.ui.navigationHistory, path].slice(-10),
        },
      };
    });
  },
  pruneHistory(index: number) {
    set((state) => ({
      ui: {
        ...state.ui,
        navigationHistory: state.ui.navigationHistory.slice(0, index),
      },
    }));
  },
  openCardModal(code) {
    set((state) => ({
      ui: {
        ...state.ui,
        cardModal: {
          ...state.ui.cardModal,
          code,
        },
      },
    }));
  },
  closeCardModal() {
    set((state) => ({
      ui: {
        ...state.ui,
        cardModal: {
          ...state.ui.cardModal,
          code: undefined,
        },
      },
    }));
  },
  setCardModalConfig(config) {
    set((state) => ({
      ui: {
        ...state.ui,
        cardModal: {
          ...state.ui.cardModal,
          config,
        },
      },
    }));
  },
});
