import type { Card } from "@arkham-build/shared";
import { MAX_EQUIP_VALUE } from "@arkham-build/shared";
import { getCardColor } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import css from "./card-equip-load.module.css";

type Props = {
  card: Card;
};

export function CardEquipLoad({ card }: Props) {
  if (card.type_code !== "gear" || card.equip_value == null) return null;
  const equipValue = card.equip_value;
  const colorCls = getCardColor(card);
  return (
    <div className={css["equip-load"]}>
      {Array.from({ length: MAX_EQUIP_VALUE }, (_, i) => (
        <span
          key={`equip-${i + 1}`}
          className={cx(
            css["equip-square"],
            i < equipValue && cx(css["filled"], colorCls),
          )}
        />
      ))}
    </div>
  );
}
