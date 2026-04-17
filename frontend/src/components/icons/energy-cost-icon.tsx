import { numericalStr } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { AspectIcon, ASPECT_DISPLAY_NAMES } from "./aspect-icon";
import css from "./energy-cost-icon.module.css";

type Props = {
  aspect?: string | null;
  className?: string;
  cost?: number | string | null;
};

export function EnergyCostIcon({ aspect, className, cost }: Props) {
  const displayName = aspect
    ? (ASPECT_DISPLAY_NAMES[aspect as keyof typeof ASPECT_DISPLAY_NAMES] ?? aspect)
    : null;

  return (
    <div className={css["container"]}>
      <div className={cx(css["badge"], className)}>
        <AspectIcon aspect={aspect} className={css["badge-svg"]} />
        {cost != null && (
          <span className={css["badge-number"]}>{numericalStr(cost)}</span>
        )}
      </div>
      {displayName && <span className={css["badge-type"]}>{displayName}</span>}
    </div>
  );
}
