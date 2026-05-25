import type { Card } from "@earthborne-build/shared";
import campaignGuideEntryIndex from "@/assets/campaign-guide-entry-index.json";

type CampaignGuideEntryLink = {
  [packCode: string]: string;
};

export type CampaignGuideEntryChoice = {
  href: string;
  label: string;
  pageId: string;
  packCode: string;
};

type CampaignGuideEntryIndex = {
  entries: Record<string, CampaignGuideEntryLink>;
};

const entryIndex = campaignGuideEntryIndex as CampaignGuideEntryIndex;

export function getCampaignGuideEntryHref(
  card: Pick<Card, "campaign_guide_entry" | "pack_code">,
) {
  const choices = getCampaignGuideEntryChoices(card);

  return choices.length === 1 ? choices[0].href : null;
}

export function getCampaignGuideEntryChoices(
  card: Pick<Card, "campaign_guide_entry" | "pack_code">,
): CampaignGuideEntryChoice[] {
  const entry = getCampaignGuideEntry(card);
  if (!entry) return [];

  const pageIds = entryIndex.entries[entry];
  if (!pageIds) return [];

  return Object.entries(pageIds).map(([packCode, pageId]) => ({
    href: `/rules?tab=campaign-guides#${pageId}`,
    label: formatCampaignGuideEntryChoiceLabel(entry, packCode, pageIds),
    packCode,
    pageId,
  }));
}

export function getCampaignGuideEntry(
  card: Pick<Card, "campaign_guide_entry">,
) {
  const entry =
    card.campaign_guide_entry == null
      ? null
      : String(card.campaign_guide_entry).trim();

  return entry || "";
}

function formatCampaignGuideEntryChoiceLabel(
  entry: string,
  packCode: string,
  pageIds: CampaignGuideEntryLink,
) {
  if (Object.keys(pageIds).length === 1 || packCode === "ebr") return entry;
  return `${entry} (${packCode.toUpperCase()})`;
}
