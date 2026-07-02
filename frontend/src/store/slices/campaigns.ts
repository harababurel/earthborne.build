import type { Campaign, Id } from "@earthborne-build/shared";
import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import {
  applyEndDay,
  applyTravel,
  undoTravel as undoTravelPatch,
} from "../lib/campaign/travel";
import { cloneCampaign, createCampaign } from "../lib/campaign-factory";
import { dehydrate } from "../persist";
import type { StoreState } from ".";
import type { CampaignsSlice } from "./campaigns.types";

export const createCampaignsSlice: StateCreator<
  StoreState,
  [],
  [],
  CampaignsSlice
> = (set, get) => ({
  async createCampaign(input) {
    const campaign = createCampaign({
      name: input.name,
      cycle_id: input.cycle_id,
      expansions: input.expansions ?? [],
      current_location: input.current_location ?? null,
      deck_ids: input.deck_ids ?? [],
    });

    set((state) => ({
      data: {
        ...state.data,
        campaigns: { ...state.data.campaigns, [campaign.id]: campaign },
      },
    }));

    await dehydrate(get(), "app");
    return campaign.id;
  },

  async duplicateCampaign(id) {
    const campaign = get().data.campaigns[id];
    assert(campaign, `Campaign ${id} does not exist.`);

    const next = cloneCampaign(campaign);

    set((state) => ({
      data: {
        ...state.data,
        campaigns: { ...state.data.campaigns, [next.id]: next },
      },
    }));

    await dehydrate(get(), "app");
    return next.id;
  },

  async deleteCampaign(id, callback) {
    callback?.();

    set((state) => {
      const campaigns = { ...state.data.campaigns };
      delete campaigns[id];
      return { data: { ...state.data, campaigns } };
    });

    await dehydrate(get(), "app");
  },

  async updateCampaign(id, patch) {
    set((state) => {
      const campaign = state.data.campaigns[id];
      assert(campaign, `Campaign ${id} does not exist.`);

      const next: Campaign = {
        ...campaign,
        ...patch,
        date_update: new Date().toISOString(),
      };

      return {
        data: {
          ...state.data,
          campaigns: { ...state.data.campaigns, [id]: next },
        },
      };
    });

    await dehydrate(get(), "app");
  },

  async linkDeckToCampaign(campaignId, deckId) {
    const campaign = get().data.campaigns[campaignId];
    assert(campaign, `Campaign ${campaignId} does not exist.`);
    if (campaign.deck_ids.includes(deckId)) return;

    // A deck belongs to at most one campaign — unlink it everywhere else.
    for (const other of Object.values(get().data.campaigns)) {
      if (other.id !== campaignId && other.deck_ids.includes(deckId)) {
        await get().unlinkDeckFromCampaign(other.id, deckId);
      }
    }

    await get().updateCampaign(campaignId, {
      deck_ids: [...campaign.deck_ids, deckId],
    });
  },

  async unlinkDeckFromCampaign(campaignId, deckId) {
    const campaign = get().data.campaigns[campaignId];
    assert(campaign, `Campaign ${campaignId} does not exist.`);

    await get().updateCampaign(campaignId, {
      deck_ids: campaign.deck_ids.filter((id: Id) => id !== deckId),
    });
  },

  async travel(campaignId, input) {
    const campaign = get().data.campaigns[campaignId];
    assert(campaign, `Campaign ${campaignId} does not exist.`);
    await get().updateCampaign(campaignId, applyTravel(campaign, input));
  },

  async undoTravel(campaignId) {
    const campaign = get().data.campaigns[campaignId];
    assert(campaign, `Campaign ${campaignId} does not exist.`);
    await get().updateCampaign(campaignId, undoTravelPatch(campaign));
  },

  async endDay(campaignId) {
    const campaign = get().data.campaigns[campaignId];
    assert(campaign, `Campaign ${campaignId} does not exist.`);
    await get().updateCampaign(campaignId, applyEndDay(campaign));
  },
});
