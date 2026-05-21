import type { Card } from "@earthborne-build/shared";
import {
  locationSymbolUrlsByNormalizedName,
  pathCardSymbolUrlBySetCode,
} from "@/assets/symbols";
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

  if (card.category_id === "location") {
    const symbolUrl =
      locationSymbolUrlsByNormalizedName[card.name.toLowerCase()];
    if (!symbolUrl) return null;
    return (
      <div className={cx(css["icon_location"], className)}>
        <img src={symbolUrl} alt="" aria-hidden />
      </div>
    );
  }

  if (card.category_id != null && card.category_id !== "ranger") {
    const symbolUrl = card.set_code
      ? pathCardSymbolUrlBySetCode[card.set_code]
      : undefined;
    if (!symbolUrl) return null;
    return (
      <div className={cx(css["icon_location"], className)}>
        <img src={symbolUrl} alt="" aria-hidden />
      </div>
    );
  }

  if (card.type_code === "aspect") {
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
