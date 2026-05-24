import type { Card } from "@earthborne-build/shared";
import campaignGuideEntryIndex from "@/assets/campaign-guide-entry-index.json";

type CampaignGuideEntryLink = {
  [packCode: string]: string;
};

type CampaignGuideEntryIndex = {
  entries: Record<string, CampaignGuideEntryLink>;
};

const entryIndex = campaignGuideEntryIndex as CampaignGuideEntryIndex;

export function getCampaignGuideEntryHref(
  card: Pick<Card, "campaign_guide_entry" | "pack_code">,
) {
  const entry = card.campaign_guide_entry?.trim();
  if (!entry) return null;

  const pageIds = entryIndex.entries[entry];
  if (!pageIds) return null;

  const fallbackPageId =
    Object.keys(pageIds).length === 1 ? Object.values(pageIds)[0] : null;
  const pageId = pageIds[card.pack_code] ?? fallbackPageId;

  return pageId ? `/rules?tab=campaign-guides#${pageId}` : null;
}
