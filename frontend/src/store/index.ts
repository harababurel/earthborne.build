import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { StoreState } from "./slices";
import { createAchievementsSlice } from "./slices/achievements";
import { createAppSlice } from "./slices/app";
import { createAuthSlice } from "./slices/auth";
import { createCampaignsSlice } from "./slices/campaigns";
import { createDataSlice } from "./slices/data";
import { createDeckCollectionSlice } from "./slices/deck-collection";
import { createDeckCreateSlice } from "./slices/deck-create";
import { createDeckEditsSlice } from "./slices/deck-edits";
import { createListsSlice } from "./slices/lists";
import { createMetadataSlice } from "./slices/metadata";
import { createRecommenderSlice } from "./slices/recommender";
import { createSettingsSlice } from "./slices/settings";
import { createSharingSlice } from "./slices/sharing";
import { createSyncSlice } from "./slices/sync";
import { createUISlice } from "./slices/ui";

// biome-ignore lint/suspicious/noExplicitAny: safe.
const stateCreator = (...args: [any, any, any]) => ({
  ...createAppSlice(...args),
  ...createAchievementsSlice(...args),
  ...createDataSlice(...args),
  ...createCampaignsSlice(...args),
  ...createMetadataSlice(...args),
  ...createListsSlice(...args),
  ...createSettingsSlice(...args),
  ...createUISlice(...args),
  ...createDeckEditsSlice(...args),
  ...createDeckCreateSlice(...args),
  ...createSharingSlice(...args),
  ...createDeckCollectionSlice(...args),
  ...createRecommenderSlice(...args),
  ...createAuthSlice(...args),
  ...createSyncSlice(...args),
});

export const useStore = create<StoreState>()(
  import.meta.env.MODE === "test" ? stateCreator : devtools(stateCreator),
);
