// Stub — ER has no customization system.

import type { Props as ListCardProps } from "@/components/list-card/list-card";
import type { ResolvedDeck } from "@/store/lib/types";
import type { CustomizationUpgrade } from "@/store/selectors/decks";

type Props = {
  deck?: ResolvedDeck;
  differences: CustomizationUpgrade[];
  listCardProps?: Partial<ListCardProps>;
  title?: string;
  size?: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CustomizableDiff(_props: Props) {
  return null;
}
