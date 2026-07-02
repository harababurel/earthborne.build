import type { Campaign } from "@earthborne-build/shared";
import { describe, expect, it } from "vitest";
import type { StoreState } from "@/store/slices";
import migrate from "./0014-campaign-travel-days";

function makeState(campaign: Partial<Campaign>): StoreState {
  return {
    data: {
      campaigns: { c1: { id: "c1", ...campaign } },
    },
  } as unknown as StoreState;
}

describe("0014-campaign-travel-days", () => {
  it("shifts camped entries back to the day the travel happened", () => {
    const state = makeState({
      day: 3,
      history: [
        { day: 1, location: "white_sky", path_terrain: "lakeshore" },
        {
          day: 2,
          location: "mount_nim",
          path_terrain: "mountain_pass",
          camped: true,
        },
      ],
    });

    migrate(state, 14);

    expect(state.data.campaigns.c1.history).toEqual([
      { day: 1, location: "white_sky", path_terrain: "lakeshore" },
      {
        day: 1,
        location: "mount_nim",
        path_terrain: "mountain_pass",
        camped: true,
      },
    ]);
  });

  it("drops legacy end-day entries (stationary, no terrain, not camped)", () => {
    const state = makeState({
      day: 3,
      history: [
        { day: 1, location: "white_sky", path_terrain: "lakeshore" },
        { day: 2, location: "white_sky", path_terrain: null, camped: false },
      ],
    });

    migrate(state, 14);

    expect(state.data.campaigns.c1.history).toEqual([
      { day: 1, location: "white_sky", path_terrain: "lakeshore" },
    ]);
    // The day counter itself is untouched — the end day still happened.
    expect(state.data.campaigns.c1.day).toBe(3);
  });

  it("backfills the start location", () => {
    const state = makeState({ day: 1, history: [] });

    migrate(state, 14);

    expect(state.data.campaigns.c1.start_location).toBe("lone_tree_station");
  });

  it("does nothing for already-migrated stores", () => {
    const history = [
      { day: 2, location: "white_sky", path_terrain: null, camped: false },
    ];
    const state = makeState({ day: 3, history });

    migrate(state, 15);

    expect(state.data.campaigns.c1.history).toEqual(history);
    expect(state.data.campaigns.c1.start_location).toBeUndefined();
  });
});
