import type { Card as CardT } from "@arkham-build/shared";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CardWithRelations, ResolvedCard } from "@/store/lib/types";
import { reversed } from "@/utils/card-utils";
import { dataLanguage } from "@/utils/formatting";
import { Button } from "../ui/button";
import css from "./card.module.css";
import { CardBack } from "./card-back";
import { CardContainer } from "./card-container";
import { CardFace } from "./card-face";

type Props = {
  canToggleBackside?: boolean;
  children?: React.ReactNode;
  className?: string;
  omitImage?: boolean;
  onPrintingSelect?: (card: CardT) => void;
  resolvedCard: ResolvedCard | CardWithRelations;
  slotImageWrapperProps?: React.HTMLAttributes<HTMLDivElement> & {
    ref?: React.Ref<HTMLDivElement>;
  };
  slotCardFooter?: React.ReactNode;
  slotHeaderActions?: React.ReactNode;
  titleLinks?: "card" | "card-modal" | "dialog";
  size?: "compact" | "tooltip" | "full";
};

/**
 * Cards are available in three sizes:
 *  - `full`: Renders a full card with all metadata.
 *  - `compact`: Renders a card without its backside and with a smaller card image.
 *  - `tooltip`: Renders the card as a tooltip that is shown in card lists.
 */
export function Card(props: Props) {
  const {
    canToggleBackside,
    children,
    className,
    omitImage,
    onPrintingSelect,
    resolvedCard,
    size = "full",
    slotImageWrapperProps,
    slotCardFooter,
    slotHeaderActions,
    titleLinks,
  } = props;

  const [backVisible, toggleBack] = useState(!canToggleBackside);

  const { t } = useTranslation();

  const { back, card } = resolvedCard;
  const cardReversed = reversed(card);

  const frontNode = (
    <CardFace
      className={className}
      omitImage={omitImage}
      onPrintingSelect={onPrintingSelect}
      resolvedCard={resolvedCard}
      size={size}
      slotImageWrapperProps={slotImageWrapperProps}
      slotHeaderActions={slotHeaderActions}
      titleLinks={titleLinks}
    >
      {slotCardFooter}
    </CardFace>
  );

  let backNode = null;

  if (card.double_sided && !back) {
    backNode = <CardBack card={card} size={size} />;
  } else if (back) {
    backNode = <CardFace resolvedCard={back} size={size} />;
  }

  const backToggle = !!backNode && canToggleBackside && (
    <Button
      className={css["card-backtoggle"]}
      data-testid="card-backtoggle"
      onClick={() => toggleBack((p) => !p)}
    >
      {backVisible ? <ChevronUpIcon /> : <ChevronDownIcon />}
      {t("card_view.actions.view_backside")}
    </Button>
  );

  return (
    <CardContainer
      data-testid={`card-${resolvedCard.card.code}`}
      size={size}
      lang={dataLanguage()}
    >
      {cardReversed ? backNode : frontNode}
      {backToggle}
      {backVisible && (cardReversed ? frontNode : backNode)}
      {children}
    </CardContainer>
  );
}
