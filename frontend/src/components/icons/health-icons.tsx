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

export function PresenceIcon({
  presence,
  label,
}: {
  presence?: string | number | null;
  label: string;
}) {
  if (presence == null) return null;

  return (
    <div
      aria-label={`${label} ${presence}`}
      className={css["presence"]}
      data-testid="presence"
      data-value={presence}
      role="img"
    >
      <svg
        aria-hidden="true"
        className={css["presence-icon"]}
        viewBox="0 0 1052 1024"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d={PRESENCE_ICON_PATH} />
      </svg>
      <div className={css["icon-cost-wrapper"]}>
        <span className={css["icon-content"]}>
          <span className={css["icon-cost"]}>{presence}</span>
        </span>
      </div>
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

const PRESENCE_ICON_PATH =
  "M934.924 869.698q5.225 10.458 9.413 21.967t9.413 23.011q4.187 8.367 6.276 17.78t6.276 18.825q-3.143-2.091-4.706-2.091t-2.615-1.046q-20.916-5.225-39.22-12.555t-36.085-14.637q-10.458-5.225-19.871-7.849t-18.825-7.849q-41.836-20.916-81.05-43.927t-78.968-48.108q-7.322 28.238-21.441 54.385t-33.99 46.018-46.018 31.899-57.52 12.028q-32.423 0-58.571-12.028t-46.018-31.899-33.468-46.018-20.916-54.385q-62.752 39.747-126.022 73.734t-132.301 58.045q-4.187 1.046-9.931 2.615t-12.028 3.661q2.091-6.276 3.661-12.028t3.661-9.931q6.276-15.689 11.504-30.335t11.504-29.283q8.367-20.916 16.734-38.175t18.825-36.085q5.225-8.367 9.413-17.78t9.413-18.825q9.413-16.734 20.395-33.468t20.395-32.423q3.143-6.276 6.797-11.504t5.752-10.458q-29.283-8.367-55.43-21.441t-46.018-32.944-31.379-46.018-11.504-58.571q0-31.379 12.028-57.52t32.423-46.542 46.542-34.514 54.385-20.395q-8.367-14.637-16.734-27.717t-17.78-27.717q-20.916-33.468-39.747-70.594t-32.423-73.734q-7.322-7.322-10.458-18.825-3.143-8.367-6.797-17.261t-5.752-17.261q-2.091-6.276-4.706-13.073t-4.706-14.119q23.011 7.322 42.357 15.164t38.175 16.21q20.916 8.367 38.175 16.734t36.085 16.734q33.468 17.78 64.322 36.605t61.182 37.65q6.276-28.238 20.395-54.909t34.514-46.542 46.542-31.899 57.52-12.028q33.468 0 59.091 12.028t45.497 31.899 33.468 46.018 21.967 55.43l60.661-37.65q30.335-18.825 63.797-36.605 18.825-8.367 36.605-16.734t37.65-16.734q18.825-8.367 38.175-16.21t43.402-15.164q-8.367 23.011-16.21 42.357t-16.21 38.175q-4.187 13.599-10.458 25.629t-12.555 23.532q-4.187 7.322-6.276 13.599t-4.187 11.504q-26.147 48.108-58.571 99.357l-10.458 16.734q-2.091 2.091-2.615 4.187t-2.615 4.187q29.283 8.367 55.43 21.967t46.018 33.468 31.899 45.497 12.028 59.091q0 31.379-12.028 57.52t-31.899 46.018-46.018 33.99-54.385 21.441q8.367 14.637 16.734 27.192t16.734 26.147q11.504 17.78 20.916 35.559l18.825 35.559q9.413 18.825 17.261 36.085t17.261 38.175z";
