import type { Campaign, CampaignCycle, Id } from "@earthborne-build/shared";
import type { TravelInput } from "../lib/campaign/travel";

export type CampaignCreatePayload = {
  name: string;
  cycle_id: CampaignCycle;
  expansions?: string[];
  current_location?: string | null;
  deck_ids?: Id[];
};

export type CampaignsSlice = {
  createCampaign(input: CampaignCreatePayload): Promise<Id>;
  duplicateCampaign(id: Id): Promise<Id>;
  deleteCampaign(id: Id, callback?: () => void): Promise<void>;
  // Generic shallow-merge update — the primitive every tracker action builds on.
  updateCampaign(id: Id, patch: Partial<Campaign>): Promise<void>;
  linkDeckToCampaign(campaignId: Id, deckId: Id): Promise<void>;
  unlinkDeckFromCampaign(campaignId: Id, deckId: Id): Promise<void>;
  travel(campaignId: Id, input: TravelInput): Promise<void>;
  undoTravel(campaignId: Id): Promise<void>;
  endDay(campaignId: Id): Promise<void>;
};
