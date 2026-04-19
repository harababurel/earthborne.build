import type { Card } from "@arkham-build/shared";
import { cx } from "@/utils/cx";
import { CardHealth } from "../card-health";
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

      <CardHealth
        health={card.harm_threshold}
        sanity={card.progress_threshold}
      />
    </div>
  );
}
