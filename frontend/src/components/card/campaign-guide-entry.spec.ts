import { describe, expect, it } from "vitest";
import { getCampaignGuideEntryHref } from "./campaign-guide-entry";

describe("getCampaignGuideEntryHref", () => {
  it("handles numeric campaign guide entries", () => {
    expect(
      getCampaignGuideEntryHref({
        campaign_guide_entry: 1 as unknown as string,
        pack_code: "ebr",
      }),
    ).toBe(
      "/rules?tab=campaign-guides#doc-campaign-guides-lure-of-the-valley-missions",
    );
  });
});
