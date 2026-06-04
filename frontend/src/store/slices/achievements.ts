import type { StateCreator } from "zustand";
import { dehydrate } from "../persist";
import type { StoreState } from ".";
import type {
  AchievementCompletion,
  AchievementsSlice,
} from "./achievements.types";

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
      const completed = normalizeCompleted(state.achievements.completed);

      if (completed[id]) {
        delete completed[id];
      } else {
        completed[id] = { date: today() };
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

  async setAchievementDate(id, date) {
    set((state) => {
      const completed = normalizeCompleted(state.achievements.completed);
      const current =
        typeof completed[id] === "object" ? completed[id] : undefined;

      completed[id] = date ? { ...current, date } : omitDate(current ?? {});

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

function normalizeCompleted(
  completed: StoreState["achievements"]["completed"],
) {
  return Object.fromEntries(
    Object.entries(completed).flatMap(([id, value]) => {
      if (!value) return [];
      if (value === true) return [[id, { date: today() }]];
      return [[id, value]];
    }),
  ) as StoreState["achievements"]["completed"];
}

function omitDate(completion: AchievementCompletion) {
  const { date: _date, ...rest } = completion;
  return rest;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
