import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import type { StoreState } from ".";
import type { RecommenderSlice, RecommenderState } from "./recommender.types";

function getInitialRecommenderState(): RecommenderState {
  return {
    recommender: {
      isRelative: false,
      deckFilter: ["", ""],
      coreCards: {},
    },
  };
}

export const createRecommenderSlice: StateCreator<
  StoreState,
  [],
  [],
  RecommenderSlice
> = (set) => ({
  ...getInitialRecommenderState(),
  setIsRelative(value) {
    set((state) => ({
      recommender: {
        ...state.recommender,
        isRelative: value,
      },
    }));
  },
  setRecommenderDeckFilter(value) {
    set((state) => ({
      recommender: {
        ...state.recommender,
        deckFilter: value,
      },
    }));
  },
  addCoreCard(deckId, value) {
    set((state) => {
      const current = state.recommender.coreCards[deckId] ?? [];
      assert(!current.includes(value), `${value} already is a core card.`);

      return {
        recommender: {
          ...state.recommender,
          coreCards: {
            ...state.recommender.coreCards,
            [deckId]: [...current, value],
          },
        },
      };
    });
  },
  removeCoreCard(deckId, value) {
    set((state) => {
      const current = state.recommender.coreCards[deckId] ?? [];
      assert(current.includes(value), `${value} is not a core card.`);

      return {
        recommender: {
          ...state.recommender,
          coreCards: {
            ...state.recommender.coreCards,
            [deckId]: current.filter((v) => v !== value),
          },
        },
      };
    });
  },
});
