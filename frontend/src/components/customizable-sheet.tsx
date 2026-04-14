// Stub — ER has no customization system.
import type { Card } from "@arkham-build/shared";
import type { ResolvedDeck } from "@/store/lib/types";

type Props = { card: Card; deck: ResolvedDeck };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CustomizableSheet(_props: Props) {
  return null;
}
