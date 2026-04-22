import type { Card } from "@arkham-build/shared";
import { cx } from "@/utils/cx";
import { CardHealth } from "../card-health";

import css from "./card.module.css";

type Props = {
  card: Card;
  className?: string;
};

export function CardIcons(props: Props) {
  const { card, className } = props;

  return (
    <div className={cx(css["icons"], className)}>
      <CardHealth
        health={card.harm_threshold}
        sanity={card.progress_threshold}
      />
    </div>
  );
}
