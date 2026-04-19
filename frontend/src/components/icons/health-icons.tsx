import { cx } from "@/utils/cx";
import { CostIcon } from "./cost-icon";
import css from "./health-icons.module.css";

export function HealthIcon({
  health,
  hideCost,
}: {
  health?: number | null;
  hideCost?: boolean;
}) {
  if (health == null) return null;
  return (
    <div className={css["health"]} data-testid="health" data-value={health}>
      {hideCost && <i className={cx(css["icon-background"], "core-harm")} />}
      <i className={cx(css["icon-base"], "core-harm")} />
      {!hideCost && <CostIcon className={css["icon-cost"]} cost={health} />}
    </div>
  );
}

export function SanityIcon({
  sanity,
  hideCost,
}: {
  sanity?: number | null;
  hideCost?: boolean;
}) {
  if (sanity == null) return null;
  return (
    <div className={css["sanity"]} data-testid="sanity" data-value={sanity}>
      {hideCost && (
        <i className={cx(css["icon-background"], "core-progress")} />
      )}
      <i className={cx(css["icon-base"], "core-progress")} />
      {!hideCost && <CostIcon className={css["icon-cost"]} cost={sanity} />}
    </div>
  );
}
