import { moonPathForDay } from "@/store/lib/campaign/data";
import { cx } from "@/utils/cx";
import css from "./moon.module.css";

// Renders the moon phase for a calendar day. The disc outline is always drawn;
// the ported phase path (empty for a new moon) fills the illuminated portion.
export function Moon({ day, className }: { day: number; className?: string }) {
  const path = moonPathForDay(day);
  return (
    <svg className={cx(css["moon"], className)} role="img" viewBox="0 0 32 32">
      <title>{`Moon, day ${day}`}</title>
      <circle className={css["disc"]} cx="16" cy="16" r="11.7" />
      {path && <path className={css["phase"]} d={path} />}
    </svg>
  );
}
