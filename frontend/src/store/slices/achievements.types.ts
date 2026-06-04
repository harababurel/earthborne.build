import type { AchievementId } from "@/pages/rules-reference/achievements";

export type AchievementsState = {
  completed: Partial<Record<AchievementId, boolean>>;
};

export type AchievementsSlice = {
  achievements: AchievementsState;
  clearAchievements(): Promise<void>;
  toggleAchievement(id: AchievementId): Promise<void>;
};
