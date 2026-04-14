// Stub — ER has no customization system.
import type { Card } from "@arkham-build/shared";
import type { ResolvedDeck } from "@/store/lib/types";

type Props = {
  canEdit?: boolean;
  card: Card;
  deck?: ResolvedDeck;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CustomizationsEditor(_props: Props) {
  return null;
}
