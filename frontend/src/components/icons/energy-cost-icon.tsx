import { numericalStr } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { AspectIcon } from "./aspect-icon";
import css from "./energy-cost-icon.module.css";

type Props = {
  aspect?: string | null;
  className?: string;
  cost?: number | string | null;
};

export function EnergyCostIcon({ aspect, className, cost }: Props) {
  return (
    <div className={css["container"]}>
      <div className={cx(css["badge"], className)} data-aspect={aspect ?? undefined}>
        <AspectIcon aspect={aspect} className={css["badge-svg"]} />
        {cost != null && (
          <span className={css["badge-number"]}>{numericalStr(cost)}</span>
        )}
      </div>
    </div>
  );
}
