import type { Card } from "@earthborne-build/shared";
import { getCardColor } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import css from "./card-icon.module.css";
import { EnergyCostIcon } from "./icons/energy-cost-icon";

type Props = {
  card: Card;
  className?: string;
  inverted?: boolean;
};

export function CardIcon(props: Props) {
  const { card, className } = props;

  if (
    (card.category_id != null && card.category_id !== "ranger") ||
    card.type_code === "aspect"
  ) {
    return null;
  }

  if (card.type_code === "role") {
    return null;
  }

  const colorCls = getCardColor(card);

  return (
    <EnergyCostIcon
      aspect={card.aspect_requirement_type}
      className={cx(css["icon_cost"], colorCls, className)}
      cost={card.energy_cost}
    />
  );
}
