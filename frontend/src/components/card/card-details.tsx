import type { Card } from "@arkham-build/shared";
import { IRREGULAR_TOKEN_PLURALS } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import {
  displayAttribute,
  getCardColor,
  numericalStr,
} from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import css from "./card.module.css";

type Props = {
  card: Card;
  face?: "simple-back";
  omitSlotIcon?: boolean;
};

export function CardDetails(props: Props) {
  const { card } = props;
  const { t } = useTranslation();

  const aspectColorClass = getCardColor(card).toLowerCase();

  const countVal = card.token_count;
  const countNum = Number(countVal);
  const tokenName = card.token_name;
  const tokenKey = tokenName?.toLowerCase() ?? "";

  const dbPlural = card.token_plural?.includes(",")
    ? card.token_plural.split(",")[1]
    : card.token_plural;

  const tokenLabel =
    countNum === 1
      ? tokenName
      : (IRREGULAR_TOKEN_PLURALS[tokenKey] ?? dbPlural ?? `${tokenName}s`);

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

        {countVal != null && tokenName && (
          <div className={cx(css["token-box"], css[aspectColorClass])}>
            <div className={css["token-count"]}>{numericalStr(countVal)}</div>
            <div className={css["token-label"]}>{tokenLabel}</div>
          </div>
        )}
      </div>
    </div>
  );
}
