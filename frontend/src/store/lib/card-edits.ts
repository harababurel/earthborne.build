import type { Card } from "@arkham-build/shared";
import type { Metadata } from "@/store/slices/metadata.types";
import type { Customizations } from "./types";

/**
 * ER has no taboo system. This is a no-op stub kept for call-site compatibility.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function applyTaboo(
  card: Card,
  _metadata: Metadata,
  _tabooSetId: number | null | undefined,
): Card {
  return card;
}

/**
 * ER has no customization system. This is a no-op stub kept for call-site compatibility.
 */
export function applyCardChanges(
  card: Card,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _metadata: Metadata,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _tabooSetId: number | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _customizations: Customizations | undefined,
): Card {
  return card;
}
