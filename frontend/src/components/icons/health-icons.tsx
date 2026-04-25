import { cx } from "@/utils/cx";
import css from "./health-icons.module.css";

export function HealthIcon({
  health,
  hideCost,
}: {
  health?: string | number | null;
  hideCost?: boolean;
}) {
  if (health == null) return null;

  const value =
    typeof health === "string" ? health.replace(/\[per_ranger\]/g, "") : health;
  const isPerRanger =
    typeof health === "string" && health.includes("[per_ranger]");

  return (
    <div className={css["health"]} data-testid="health" data-value={health}>
      {hideCost && <i className={cx(css["icon-background"], "core-harm")} />}
      <i className={cx(css["icon-base"], "core-harm")} />
      {!hideCost && (
        <div className={css["icon-cost-wrapper"]}>
          <span className={css["icon-content"]}>
            <span className={css["icon-cost"]}>{value}</span>
            {isPerRanger && (
              <i className={cx(css["icon-per-ranger"], "core-per_ranger")} />
            )}
          </span>
        </div>
      )}
    </div>
  );
}

export function SanityIcon({
  sanity,
  hideCost,
}: {
  sanity?: string | number | null;
  hideCost?: boolean;
}) {
  if (sanity == null) return null;

  const isRanger = typeof sanity === "string" && sanity === "[ranger]";
  const value =
    typeof sanity === "string" ? sanity.replace(/\[per_ranger\]/g, "") : sanity;
  const isPerRanger =
    typeof sanity === "string" && sanity.includes("[per_ranger]");

  return (
    <div className={css["sanity"]} data-testid="sanity" data-value={sanity}>
      {hideCost && (
        <i className={cx(css["icon-background"], "core-progress")} />
      )}
      <i className={cx(css["icon-base"], "core-progress")} />
      {!hideCost && (
        <div className={css["icon-cost-wrapper"]}>
          {isRanger ? (
            <i className={cx(css["icon-ranger"], "core-ranger")} />
          ) : (
            <span className={css["icon-content"]}>
              <span className={css["icon-cost"]}>{value}</span>
              {isPerRanger && (
                <i className={cx(css["icon-per-ranger"], "core-per_ranger")} />
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
