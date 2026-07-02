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
    await store.getState().linkDeckToCampaign(id, "deck-1");

    const copyId = await store.getState().duplicateCampaign(id);
    const copy = store.getState().data.campaigns[copyId];

    expect(copyId).not.toBe(id);
    expect(copy.name).toBe("(Copy) Original");
    expect(copy.expansions).toEqual(["sib"]);
    expect(copy.next_campaign_id).toBeNull();
    // A deck belongs to at most one campaign — the copy starts without a party.
    expect(copy.deck_ids).toEqual([]);
    expect(store.getState().data.campaigns[id].deck_ids).toEqual(["deck-1"]);
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

  it("moves a deck between campaigns on link", async () => {
    const a = await store
      .getState()
      .createCampaign({ name: "A", cycle_id: "core" });
    const b = await store
      .getState()
      .createCampaign({ name: "B", cycle_id: "core" });

    await store.getState().linkDeckToCampaign(a, "deck-1");
    await store.getState().linkDeckToCampaign(b, "deck-1");

    expect(store.getState().data.campaigns[a].deck_ids).toEqual([]);
    expect(store.getState().data.campaigns[b].deck_ids).toEqual(["deck-1"]);
  });

  it("stores the start location for undo", async () => {
    const id = await store.getState().createCampaign({
      name: "Journey",
      cycle_id: "core",
      current_location: "lone_tree_station",
    });

    const campaign = store.getState().data.campaigns[id];
    expect(campaign.start_location).toBe("lone_tree_station");

    await store
      .getState()
      .travel(id, { to: "white_sky", path_terrain: "lakeshore" });
    expect(store.getState().data.campaigns[id].current_location).toBe(
      "white_sky",
    );

    await store.getState().undoTravel(id);
    expect(store.getState().data.campaigns[id].current_location).toBe(
      "lone_tree_station",
    );
  });
});
