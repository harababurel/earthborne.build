import { useTranslation } from "react-i18next";
import type { Deck } from "@/store/schemas/deck.schema";
import { cx } from "@/utils/cx";
import { isEvolvedDeck } from "@/utils/deck-utils";
import css from "./deck-evolution-badge.module.css";

type Props = {
  deck: Pick<Deck, "rewards" | "displaced" | "maladies">;
};

export function DeckEvolutionBadge({ deck }: Props) {
  const { t } = useTranslation();
  const evolved = isEvolvedDeck(deck);

  return (
    <span className={cx(css["badge"], evolved && css["evolved"])}>
      {t(evolved ? "deck.evolution.evolved" : "deck.evolution.starter")}
    </span>
  );
}
