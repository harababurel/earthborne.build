import { cx } from "@/utils/cx";
import css from "./card-health.module.css";
import { HealthIcon, SanityIcon } from "./icons/health-icons";

type Props = {
  className?: string;
  health?: string | number | null;
  sanity?: string | number | null;
};

export function CardHealth(props: Props) {
  if (props.health == null && props.sanity == null) return null;

  return (
    <div
      className={cx(props.className, css["health"])}
      data-testid="card-health"
    >
      <HealthIcon health={props.health} />
      <SanityIcon sanity={props.sanity} />
    </div>
  );
}
