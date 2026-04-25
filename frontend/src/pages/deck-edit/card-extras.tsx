import type { Card } from "@earthborne-build/shared";
import Attachments from "@/components/attachments/attachments";
import { getMatchingAttachables } from "@/components/attachments/attachments.helpers";
import type { ResolvedDeck } from "@/store/lib/types";
import { isEmpty } from "@/utils/is-empty";
import css from "./deck-edit.module.css";
import { AddToNotes } from "./editor/add-to-notes";

type Props = {
  canEdit?: boolean;
  deck: ResolvedDeck;
  card: Card;
  quantity: number | undefined;
  currentTool: string;
  currentTab: string;
};

export function CardExtras(props: Props) {
  const { card, deck, quantity, currentTab, currentTool } = props;

  if (currentTab === "config") {
    return null;
  }

  if (currentTool === "notes") {
    return <AddToNotes card={card} deck={deck} />;
  }

  const hasAttachable =
    currentTab === "slots" && !isEmpty(getMatchingAttachables(card, deck));

  const canShowMoveButton = !!quantity && currentTab !== "slots";

  if (!hasAttachable && !canShowMoveButton) {
    return null;
  }

  return (
    <div className={css["extra-row"]}>
      {hasAttachable && <Attachments card={card} resolvedDeck={deck} />}
    </div>
  );
}
