import { CampaignSchema } from "@earthborne-build/shared";
import { describe, expect, it } from "vitest";
import {
  getCampaignCycles,
  getCampaignExpansions,
  getMapLocations,
  getPathTypes,
  getWeather,
  moonPathForDay,
} from "./data";
import {
  adjacentLocations,
  applyTravel,
  undoTravel,
  weatherForDay,
} from "./travel";

function makeCampaign(overrides = {}) {
  return CampaignSchema.parse({
    id: "c1",
    name: "Test",
    date_creation: "2026-01-01",
    date_update: "2026-01-01",
    cycle_id: "core",
    ...overrides,
  });
}

describe("campaign content data", () => {
  it("exposes the two playable cycles", () => {
    expect(getCampaignCycles()).toEqual(["core", "loa"]);
  });

  it("offers sib/sos only for core", () => {
    expect(getCampaignExpansions("core").map((e) => e.id)).toEqual([
      "sib",
      "sos",
    ]);
    expect(getCampaignExpansions("loa")).toEqual([]);
  });

  it("filters path types by cycle", () => {
    const loaTerrains = getPathTypes("loa").map((p) => p.id);
    expect(loaTerrains).toContain("cave_system");
    expect(getPathTypes("core").map((p) => p.id)).not.toContain("cave_system");
  });

  it("provides a moon path per day (empty for new moon)", () => {
    expect(typeof moonPathForDay(1)).toBe("string");
    expect(moonPathForDay(15).length).toBeGreaterThan(0);
    expect(moonPathForDay(28)).toBe(""); // new moon
    expect(moonPathForDay(31)).toBe(moonPathForDay(1)); // extended cycle
  });

  it("adds expansion locations only when the expansion is active", () => {
    const base = getMapLocations("core", []);
    const withSib = getMapLocations("core", ["sib"]);
    expect(Object.keys(withSib).length).toBeGreaterThan(
      Object.keys(base).length,
    );
    expect(base.brookside).toBeUndefined();
    expect(withSib.brookside).toBeDefined();
  });

  it("builds bidirectional connections", () => {
    const map = getMapLocations("loa", []);
    const a = map.spire?.connections.find((c) => c.id === "the_chimney");
    const b = map.the_chimney?.connections.find((c) => c.id === "spire");
    expect(a).toBeDefined();
    expect(b).toBeDefined();
  });
});

describe("travel", () => {
  it("moves without advancing the day and records history", () => {
    const campaign = makeCampaign({
      current_location: "spire",
      cycle_id: "loa",
    });
    const adj = adjacentLocations(campaign);
    expect(adj.length).toBeGreaterThan(0);

    const patch = applyTravel(campaign, {
      to: adj[0].id,
      path_terrain: adj[0].path,
    });
    expect(patch.day).toBe(1);
    expect(patch.current_location).toBe(adj[0].id);
    expect(patch.history).toHaveLength(1);
  });

  it("advances the day when the travel ends the day", () => {
    const campaign = makeCampaign({
      current_location: "spire",
      cycle_id: "loa",
    });
    const adj = adjacentLocations(campaign);

    const patch = applyTravel(campaign, { to: adj[0].id, camped: true });
    expect(patch.day).toBe(2);
    expect(patch.current_location).toBe(adj[0].id);
  });

  it("undoes the most recent travel", () => {
    let campaign = makeCampaign({ current_location: "spire", cycle_id: "loa" });
    const adj = adjacentLocations(campaign);
    campaign = { ...campaign, ...applyTravel(campaign, { to: adj[0].id }) };

    const patch = undoTravel(campaign);
    expect(patch.history).toHaveLength(0);
    expect(patch.day).toBe(1);
    expect(patch.current_location).toBeNull();
  });

  it("resolves weather by day", () => {
    expect(weatherForDay("core", 1, false)?.valley_id).toBe("a_perfect_day");
    expect(weatherForDay("core", 5, false)?.valley_id).toBe("downpour");
    expect(getWeather("core", true).length).toBeGreaterThan(
      getWeather("core", false).length,
    );
  });
});
