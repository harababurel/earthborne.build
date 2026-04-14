import type { Card } from "@arkham-build/shared";
import { isEnemyLike } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { range } from "@/utils/range";
import { CardHealth } from "../card-health";
import { HealthIcon } from "../icons/health-icons";
import { SkillIcons } from "../skill-icons/skill-icons";
import { SkillIconsInvestigator } from "../skill-icons/skill-icons-investigator";
import css from "./card.module.css";

type Props = {
  card: Card;
  className?: string;
};

export function CardIcons(props: Props) {
  const { card, className } = props;

  return (
    <div className={cx(css["icons"], className)}>
      {card.type_code === "role" ? (
        <SkillIconsInvestigator
          card={card}
          className={css["icons-skills"]}
          iconClassName={css["icons-skill"]}
        />
      ) : (
        <SkillIcons
          card={card}
          className={css["icons-skills"]}
          fancy
          iconClassName={css["icons-skill"]}
        />
      )}

      {!isEnemyLike(card) && card.harm_threshold && (
        <CardHealth health={card.harm_threshold} sanity={undefined} />
      )}

      {isEnemyLike(card) && card.harm_threshold && (
        <div className={css["icons-damage"]}>
          {range(0, card.harm_threshold).map((i) => (
            <HealthIcon key={i} hideCost />
          ))}
        </div>
      )}
    </div>
  );
}
