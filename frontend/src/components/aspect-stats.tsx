import type { Card } from "@earthborne-build/shared";
import { AspectIcon } from "@/components/icons/aspect-icon";
import { cx } from "@/utils/cx";
import css from "./aspect-stats.module.css";

const ASPECTS = [
  { key: "AWA", getValue: (c: Card) => c.aspect_awareness },
  { key: "SPI", getValue: (c: Card) => c.aspect_spirit },
  { key: "FIT", getValue: (c: Card) => c.aspect_fitness },
  { key: "FOC", getValue: (c: Card) => c.aspect_focus },
] as const;

type Props = {
  aspectCard: Card | undefined;
  className?: string;
  size?: "sm" | "md";
};

export function AspectStats({ aspectCard, className, size = "md" }: Props) {
  return (
    <div className={cx(css["aspect-stats"], css[size], className)}>
      {ASPECTS.map(({ key, getValue }) => (
        <div key={key} className={css["stat-item"]}>
          <div className={cx(css["aspect-square"], css[key.toLowerCase()])}>
            <AspectIcon
              aspect={key}
              className={css["white-icon"]}
              size={size === "sm" ? "2.25rem" : "3.75rem"}
            />
            <div className={css["stat-overlay"]}>
              <span className={css["stat-value"]}>
                {aspectCard ? getValue(aspectCard) : null}
              </span>
              <span className={css["stat-label"]}>{key}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
