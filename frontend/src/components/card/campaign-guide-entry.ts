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
    href: campaignGuideEntryHref(pageId),
    label: formatCampaignGuideEntryChoiceLabel(entry, packCode, pageIds),
    packCode,
    pageId,
  }));
}

// Resolves an inline `[guide] <id>` reference from card text to a single href.
// Prefers the page in the given pack, falling back to the base game (`ebr`).
// Letter-suffixed sub-entries (e.g. `1.211A`) resolve to their parent (`1.211`).
export function getCampaignGuideEntryHrefById(
  entry: string,
  preferredPackCode?: string,
): string | null {
  const pageIds =
    entryIndex.entries[entry] ??
    entryIndex.entries[entry.replace(/[A-Za-z]+$/, "")];
  if (!pageIds) return null;

  const pageId =
    (preferredPackCode && pageIds[preferredPackCode]) ??
    pageIds.ebr ??
    Object.values(pageIds)[0];

  return pageId ? campaignGuideEntryHref(pageId) : null;
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

function campaignGuideEntryHref(pageId: string) {
  return `/rules?tab=campaign-guides#${pageId}`;
}

function formatCampaignGuideEntryChoiceLabel(
  entry: string,
  packCode: string,
  pageIds: CampaignGuideEntryLink,
) {
  if (Object.keys(pageIds).length === 1 || packCode === "ebr") return entry;
  return `${entry} (${packCode.toUpperCase()})`;
}
