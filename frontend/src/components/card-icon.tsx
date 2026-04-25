import type { Card } from "@arkham-build/shared";
import { getCardColor } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import css from "./card-icon.module.css";
import { EnergyCostIcon } from "./icons/energy-cost-icon";
import { FactionIcon } from "./icons/faction-icon";

type Props = {
  card: Card;
  className?: string;
  inverted?: boolean;
};

export function CardIcon(props: Props) {
  const { card, className, inverted } = props;

  if (card.category_id === "path") {
    return null;
  }

  if (card.type_code === "role") {
    return (
      <div
        className={cx(
          css["icon_large"],
          className,
          inverted && css["icon_inverted"],
        )}
      >
        <FactionIcon code={card.aspect_requirement_type ?? ""} />
      </div>
    );
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
