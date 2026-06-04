export const ACHIEVEMENTS = [
  "unplanned-reunion",
  "electric-slide",
  "no-stone-left-unturned",
  "the-pentaverate",
  "ship-of-theseus",
  "hard-pass",
  "noodling",
  "shes-a-natural",
  "big-tech",
  "howd-that-get-in-there",
  "pro-gamer",
  "enough-already",
  "unlimited-power",
  "people-person",
  "log-flume",
  "all-out-of-options",
] as const;

export type AchievementId = (typeof ACHIEVEMENTS)[number];

export const ACHIEVEMENT_BADGES: Record<AchievementId, string> = {
  "unplanned-reunion":
    "https://earthbornegames.com/wp-content/uploads/EBR_Achievement_Badges-Unplanned_Reunion-450x450.png",
  "electric-slide":
    "https://earthbornegames.com/wp-content/uploads/EBR-Achievement_Badges-Electric_Slide-450x450.png",
  "no-stone-left-unturned":
    "https://earthbornegames.com/wp-content/uploads/EBR_Achievement_Badges-No_Stone_Unturned-450x450.png",
  "the-pentaverate":
    "https://earthbornegames.com/wp-content/uploads/EBR_Achievement_Badges-The_Pentaverate-450x450.png",
  "ship-of-theseus":
    "https://earthbornegames.com/wp-content/uploads/EBR_Achievement_Badges-Ship_of_Theseus-450x450.png",
  "hard-pass":
    "https://earthbornegames.com/wp-content/uploads/EBR_Achievement_Badges-Hard_Pass-450x450.png",
  noodling:
    "https://earthbornegames.com/wp-content/uploads/EBR_Achievement_Badges-Noodling-450x450.png",
  "shes-a-natural":
    "https://earthbornegames.com/wp-content/uploads/EBR_Achievement_Badges-Shes_A_Natural-450x450.png",
  "big-tech":
    "https://earthbornegames.com/wp-content/uploads/EBR-Achievement_Badges-Big_Tech-450x450.png",
  "howd-that-get-in-there":
    "https://earthbornegames.com/wp-content/uploads/EBR_Achievement_Badges-Howd_That_Get_in_There-1-450x450.png",
  "pro-gamer":
    "https://earthbornegames.com/wp-content/uploads/EBR_Achievement_Badges-Pro_Gamer-450x450.png",
  "enough-already":
    "https://earthbornegames.com/wp-content/uploads/EBR-Achievement_Badges-Enough_Already-450x450.png",
  "unlimited-power":
    "https://earthbornegames.com/wp-content/uploads/EBR_Achievement_Badges-Unlimited_Power-450x450.png",
  "people-person":
    "https://earthbornegames.com/wp-content/uploads/EBR_Achievement_Badges-People_Person-450x450.png",
  "log-flume":
    "https://earthbornegames.com/wp-content/uploads/EBR_Achievement_Badges-Log_Flume-450x450.png",
  "all-out-of-options":
    "https://earthbornegames.com/wp-content/uploads/EBR-Achievement_Badges-All_Out_Of_Options-450x450.png",
};
