import type { Card } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import { displayAttribute } from "@/utils/card-utils";
import css from "./card.module.css";

type Props = {
  card: Card;
  face?: "simple-back";
  omitSlotIcon?: boolean;
};

export function CardDetails(props: Props) {
  const { card } = props;
  const { t } = useTranslation();

  return (
    <div className={css["details"]}>
      <div className={css["details-text"]}>
        <p className={css["details-type"]}>
          <span>{t(`common.type.${card.type_code}`)}</span>
        </p>

        {card.traits && (
          <p className={css["details-traits"]}>
            {displayAttribute(card, "traits")}
          </p>
        )}
      </div>
    </div>
  );
}
