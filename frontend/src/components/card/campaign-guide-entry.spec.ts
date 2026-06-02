import { describe, expect, it } from "vitest";
import {
  getCampaignGuideEntryChoices,
  getCampaignGuideEntryHref,
  getCampaignGuideEntryHrefById,
} from "./campaign-guide-entry";

describe("getCampaignGuideEntryHref", () => {
  it("handles numeric campaign guide entries", () => {
    expect(
      getCampaignGuideEntryHref({
        campaign_guide_entry: 3 as unknown as string,
        pack_code: "ebr",
      }),
    ).toBe(
      "/rules?tab=campaign-guides#doc-campaign-guides-lure-of-the-valley-white-sky",
    );
  });

  it("returns all choices for duplicated campaign guide entries", () => {
    expect(
      getCampaignGuideEntryHref({
        campaign_guide_entry: 44 as unknown as string,
        pack_code: "ebr",
      }),
    ).toBeNull();

    expect(
      getCampaignGuideEntryChoices({
        campaign_guide_entry: 44 as unknown as string,
        pack_code: "ebr",
      }).map((choice) => [choice.label, choice.href]),
    ).toEqual([
      [
        "44",
        "/rules?tab=campaign-guides#doc-campaign-guides-lure-of-the-valley-kordo-ranger-veteran",
      ],
      [
        "44 (LOA)",
        "/rules?tab=campaign-guides#doc-campaign-guides-legacy-of-the-ancestors-kordo-ranger-veteran",
      ],
    ]);
  });
});

describe("getCampaignGuideEntryHrefById", () => {
  it("resolves a single-pack entry", () => {
    expect(getCampaignGuideEntryHrefById("3")).toBe(
      "/rules?tab=campaign-guides#doc-campaign-guides-lure-of-the-valley-white-sky",
    );
  });

  it("defaults a shared entry to the base game", () => {
    expect(getCampaignGuideEntryHrefById("44")).toBe(
      "/rules?tab=campaign-guides#doc-campaign-guides-lure-of-the-valley-kordo-ranger-veteran",
    );
  });

  it("prefers the requested pack for a shared entry", () => {
    expect(getCampaignGuideEntryHrefById("44", "loa")).toBe(
      "/rules?tab=campaign-guides#doc-campaign-guides-legacy-of-the-ancestors-kordo-ranger-veteran",
    );
  });

  it("falls back to the base game when the requested pack is absent", () => {
    expect(getCampaignGuideEntryHrefById("44", "sib")).toBe(
      "/rules?tab=campaign-guides#doc-campaign-guides-lure-of-the-valley-kordo-ranger-veteran",
    );
  });

  it("resolves letter-suffixed sub-entries to their parent", () => {
    expect(getCampaignGuideEntryHrefById("9.2A")).toBe(
      "/rules?tab=campaign-guides#doc-campaign-guides-lure-of-the-valley-marsh-of-rebirth-9-2",
    );
  });

  it("returns null for unknown entries", () => {
    expect(getCampaignGuideEntryHrefById("99999")).toBeNull();
  });
});
