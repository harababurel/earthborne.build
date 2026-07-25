/**
 * Absolute URL for a publicly shared campaign.
 *
 * `VITE_API_URL` may be absolute (`http://localhost:8686`), origin-relative
 * (`/api`, how the deployed frontend reaches the backend), or empty. The link
 * is meant to be handed to a third-party tool, so it must always come out
 * absolute — resolving against the page origin covers all three cases.
 */
export function publicCampaignUrl(campaignId: string) {
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  return new URL(
    `${base}/v2/public/campaign/${campaignId}`,
    window.location.origin,
  ).href;
}
