import { useState } from "react";

const STORAGE_KEY = "campaign-tracker-seen";

function hasSeenCampaignTracker() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

/**
 * Drives the "new feature" dot on the campaign tracker toggle. The dot
 * disappears for good once the user opens the campaigns sidebar section.
 */
export function useCampaignTrackerBadge() {
  const [seen, setSeen] = useState(hasSeenCampaignTracker);

  const markSeen = () => {
    if (seen) return;
    localStorage.setItem(STORAGE_KEY, "true");
    setSeen(true);
  };

  return { showBadge: !seen, markSeen } as const;
}
