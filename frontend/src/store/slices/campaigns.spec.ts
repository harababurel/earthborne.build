import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { getMockStore } from "@/test/get-mock-store";
import type { StoreState } from ".";

describe("campaigns slice", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  afterEach(async () => {
    store = await getMockStore();
  });

  it("creates a campaign with schema defaults", async () => {
    const id = await store
      .getState()
      .createCampaign({ name: "My Journey", cycle_id: "core" });

    const campaign = store.getState().data.campaigns[id];
    expect(campaign).toBeDefined();
    expect(campaign.name).toBe("My Journey");
    expect(campaign.cycle_id).toBe("core");
    expect(campaign.day).toBe(1);
    expect(campaign.rewards).toEqual([]);
    expect(campaign.deck_ids).toEqual([]);
  });

  it("updates a campaign and bumps date_update", async () => {
    const id = await store
      .getState()
      .createCampaign({ name: "Day Tracker", cycle_id: "core" });
    const before = store.getState().data.campaigns[id].date_update;

    await new Promise((r) => setTimeout(r, 2));
    await store.getState().updateCampaign(id, { day: 5 });

    const campaign = store.getState().data.campaigns[id];
    expect(campaign.day).toBe(5);
    expect(campaign.date_update).not.toBe(before);
  });

  it("duplicates a campaign as a fresh unlinked copy", async () => {
    const id = await store.getState().createCampaign({
      name: "Original",
      cycle_id: "loa",
      expansions: ["sib"],
    });
    await store.getState().updateCampaign(id, { next_campaign_id: "x" });

    const copyId = await store.getState().duplicateCampaign(id);
    const copy = store.getState().data.campaigns[copyId];

    expect(copyId).not.toBe(id);
    expect(copy.name).toBe("(Copy) Original");
    expect(copy.expansions).toEqual(["sib"]);
    expect(copy.next_campaign_id).toBeNull();
  });

  it("deletes a campaign", async () => {
    const id = await store
      .getState()
      .createCampaign({ name: "Temp", cycle_id: "core" });

    await store.getState().deleteCampaign(id);
    expect(store.getState().data.campaigns[id]).toBeUndefined();
  });

  it("links and unlinks decks without duplicates", async () => {
    const id = await store
      .getState()
      .createCampaign({ name: "Party", cycle_id: "core" });

    await store.getState().linkDeckToCampaign(id, "deck-1");
    await store.getState().linkDeckToCampaign(id, "deck-1");
    await store.getState().linkDeckToCampaign(id, "deck-2");
    expect(store.getState().data.campaigns[id].deck_ids).toEqual([
      "deck-1",
      "deck-2",
    ]);

    await store.getState().unlinkDeckFromCampaign(id, "deck-1");
    expect(store.getState().data.campaigns[id].deck_ids).toEqual(["deck-2"]);
  });
});
