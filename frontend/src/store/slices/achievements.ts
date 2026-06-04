import type { StateCreator } from "zustand";
import { dehydrate } from "../persist";
import type { StoreState } from ".";
import type { AchievementsSlice } from "./achievements.types";

export function getInitialAchievementsState() {
  return {
    achievements: {
      completed: {},
    },
  };
}

export const createAchievementsSlice: StateCreator<
  StoreState,
  [],
  [],
  AchievementsSlice
> = (set, get) => ({
  ...getInitialAchievementsState(),

  async clearAchievements() {
    set({
      achievements: {
        completed: {},
      },
    });

    await dehydrate(get(), "app");
  },

  async toggleAchievement(id) {
    set((state) => {
      const completed = { ...state.achievements.completed };

      if (completed[id]) {
        delete completed[id];
      } else {
        completed[id] = true;
      }

      return {
        achievements: {
          ...state.achievements,
          completed,
        },
      };
    });

    await dehydrate(get(), "app");
  },
});
