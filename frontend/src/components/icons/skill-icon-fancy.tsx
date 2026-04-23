import { cx } from "@/utils/cx";
import css from "./skill-icon-fancy.module.css";

type Props = {
  className?: string;
  color?: string;
  skill: string;
};

const APPROACHES = ["conflict", "connection", "exploration", "reason"];

export function SkillIconFancy(props: Props) {
  const { className, color, skill } = props;
  const isApproach = APPROACHES.includes(skill);

  return (
    <span
      className={cx(css["icon"], !color && css[skill], className)}
      style={color ? { color } : undefined}
    >
      <i className={isApproach ? `core-${skill}` : `icon-skill_${skill}`} />
      {!isApproach && (
        <i className={cx(`icon-skill_${skill}_inverted`, css["inverted"])} />
      )}
    </span>
  );
}
