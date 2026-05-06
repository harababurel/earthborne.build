import type { Card } from "@earthborne-build/shared";
import { IRREGULAR_TOKEN_PLURALS } from "@earthborne-build/shared";
import { useTranslation } from "react-i18next";
import { getCardColor, numericalStr } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { CardHealth } from "../card-health";
import { PresenceIcon } from "../icons/health-icons";

import css from "./card.module.css";

type Props = {
  card: Card;
  className?: string;
};

export function CardIcons(props: Props) {
  const { card, className } = props;
  const { t } = useTranslation();

  const aspectColorClass = getCardColor(card).toLowerCase();

  const countVal = card.token_count;
  const countIsPerRanger =
    typeof countVal === "string" && countVal.includes("[per_ranger]");
  const countDisplay =
    typeof countVal === "string"
      ? countVal.replace(/\[per_ranger\]/g, "")
      : countVal;
  const countNum = Number(countDisplay);
  const tokenName = card.token_name;
  const tokenKey = tokenName?.toLowerCase() ?? "";

  const dbPlural = card.token_plural?.includes(",")
    ? card.token_plural.split(",")[1]
    : card.token_plural;

  const tokenLabel =
    countNum === 1
      ? tokenName
      : (IRREGULAR_TOKEN_PLURALS[tokenKey] ?? dbPlural ?? `${tokenName}s`);
  const showToken = countVal != null && tokenName;
  const showPresence = card.presence != null;

  return (
    <div className={cx(css["icons"], className)}>
      <CardHealth
        health={card.harm_threshold}
        sanity={card.progress_threshold}
      />
      {(showToken || showPresence) && (
        <div className={css["auxiliary-icons"]}>
          {showToken && (
            <div className={cx(css["token-box"], css[aspectColorClass])}>
              <div className={css["token-count"]}>
                {numericalStr(countDisplay)}
                {countIsPerRanger && (
                  <i
                    className={cx(
                      css["token-count-per-ranger"],
                      "core-per_ranger",
                    )}
                  />
                )}
              </div>
              <div className={css["token-label"]}>{tokenLabel}</div>
            </div>
          )}
          {showPresence && (
            <PresenceIcon
              label={t("common.presence")}
              presence={card.presence}
            />
          )}
        </div>
      )}
    </div>
  );
}
