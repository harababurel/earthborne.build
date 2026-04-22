import type { Card } from "@arkham-build/shared";
import type { Metadata } from "@/store/slices/metadata.types";

/**
 * ER has no customization system. This is a no-op stub kept for call-site compatibility.
 */
export function applyCardChanges(
  card: Card,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _metadata: Metadata,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _customizations: unknown,
): Card {
  return card;
}
