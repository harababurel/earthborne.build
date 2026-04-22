import { useTranslation } from "react-i18next";
import type { DeckSummary } from "@/store/lib/types";
import css from "./deck-stats.module.css";
import { DefaultTooltip } from "./ui/tooltip";

type Props = {
  deck: DeckSummary;
};

export function DeckStats(props: Props) {
  const { deck } = props;
  const { t } = useTranslation();

  return (
    <div className={css["stats"]}>
      <DefaultTooltip tooltip={t("deck.stats.deck_size")}>
        <strong data-testid="deck-summary-size">
          <i className="icon-card-outline-bold" />× {deck.stats.deckSize} (
          {deck.stats.deckSizeTotal})
        </strong>
      </DefaultTooltip>
    </div>
  );
}
