import { describe, expect, it } from "vitest";
import {
  getCampaignGuideEntryChoices,
  getCampaignGuideEntryHref,
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
