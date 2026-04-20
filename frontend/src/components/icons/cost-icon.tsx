import { numericalStr } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import css from "./cost-icon.module.css";

type Props = {
  className?: string;
  cost?: string | number | null;
  style?: React.CSSProperties;
} & React.ComponentPropsWithoutRef<"span">;

export function CostIcon(props: Props) {
  const { className, cost, ...rest } = props;

  return (
    <span {...rest} className={cx(className, css["cost"])}>
      {numericalStr(cost)}
    </span>
  );
}
