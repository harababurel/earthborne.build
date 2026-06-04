import type { AchievementId } from "@/pages/rules-reference/achievements";

export type AchievementCompletion = {
  date?: string;
};

export type AchievementsState = {
  completed: Partial<Record<AchievementId, AchievementCompletion | boolean>>;
};

export type AchievementsSlice = {
  achievements: AchievementsState;
  clearAchievements(): Promise<void>;
  setAchievementDate(id: AchievementId, date: string): Promise<void>;
  toggleAchievement(id: AchievementId): Promise<void>;
};
