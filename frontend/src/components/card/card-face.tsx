import type { Card } from "@arkham-build/shared";
import { useCallback, useState } from "react";
import type { CardWithRelations, ResolvedCard } from "@/store/lib/types";
import { displayAttribute, sideways } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { CardScan } from "../card-scan";
import { CardThumbnail } from "../card-thumbnail";
import css from "./card.module.css";
import { CardDetails } from "./card-details";
import { CardHeader } from "./card-header";
import { CardIcons } from "./card-icons";
import { CardMeta } from "./card-meta";
import { CardText } from "./card-text";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  omitImage?: boolean;
  onPrintingSelect?: (card: Card) => void;
  resolvedCard: CardWithRelations | ResolvedCard;
  size: "compact" | "tooltip" | "full";
  slotHeaderActions?: React.ReactNode;
  titleLinks?: "card" | "card-modal" | "dialog";
}

export function CardFace(props: Props) {
  const {
    children,
    className,
    omitImage,
    onPrintingSelect,
    resolvedCard,
    size,
    slotHeaderActions,
    titleLinks,
    ...rest
  } = props;

  const { card } = resolvedCard;
  const [isSideways, setSideways] = useState(sideways(card));

  const showImage = !omitImage;

  const onFlip = useCallback((_: boolean, sideways: boolean) => {
    setSideways(sideways);
  }, []);

  return (
    <article
      className={cx(
        css["card"],
        isSideways && css["sideways"],
        showImage && css["has-image"],
        css[size],
        className,
      )}
      data-testid="card-face"
      {...rest}
    >
      <CardHeader
        card={card}
        slotHeaderActions={slotHeaderActions}
        titleLinks={titleLinks}
      />

      <div className={css["pre"]}>
        <CardDetails card={card} />
        <CardIcons card={card} />
      </div>

      <div className={css["content"]}>
        <CardText
          flavor={displayAttribute(card, "flavor")}
          size={size}
          text={displayAttribute(card, "text")}
          typeCode={card.type_code}
        />
        <CardMeta
          linked={size !== "tooltip"}
          onPrintingSelect={onPrintingSelect}
          resolvedCard={resolvedCard}
          size={size}
        />
        {children}
      </div>

      {showImage &&
        (size === "full" ? (
          <div className={css["image"]}>
            <CardScan card={card} onFlip={onFlip} />
          </div>
        ) : (
          <div className={css["image"]}>
            <CardThumbnail card={card} />
          </div>
        ))}
    </article>
  );
}
