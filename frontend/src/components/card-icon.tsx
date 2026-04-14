import { type Card, cardLevel } from "@arkham-build/shared";
import { getCardColor } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import css from "./card-icon.module.css";
import { CostIcon } from "./icons/cost-icon";
import { FactionIcon } from "./icons/faction-icon";
import { LevelIcon } from "./icons/level-icon";

type Props = {
  card: Card;
  className?: string;
  inverted?: boolean;
};

export function CardIcon(props: Props) {
  const { card, className, inverted } = props;

  if (card.type_code === "role") {
    return (
      <div
        className={cx(
          css["icon_large"],
          className,
          inverted && css["icon_inverted"],
        )}
      >
        <FactionIcon code={card.energy_aspect ?? ""} />
      </div>
    );
  }

  const level = cardLevel(card);

  const colorCls = getCardColor(card);

  return (
    <div
      className={cx(
        css["icon_cost"],
        colorCls,
        className,
        inverted && css["icon_inverted"],
      )}
    >
      {card.energy_cost != null && card.energy_cost >= 10 ? (
        <span className={cx(css["icon-children"])}>
          <CostIcon cost={card.energy_cost.toString().split("")[0]} />
          <CostIcon cost={card.energy_cost.toString().split("")[1]} />
        </span>
      ) : (
        <CostIcon className={css["icon-child"]} cost={card.energy_cost} />
      )}
      <LevelIcon
        className={css["icon-level"]}
        inverted={inverted}
        level={level}
      />
    </div>
  );
}
