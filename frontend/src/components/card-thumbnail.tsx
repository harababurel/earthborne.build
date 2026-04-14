import type { Card } from "@arkham-build/shared";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { getCardColor, thumbnailUrl } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { useAgathaEasterEggTransform } from "@/utils/easter-egg-agatha";
import css from "./card-thumbnail.module.css";

type Props = {
  card: Card;
  className?: string;
  suffix?: string;
};

// memoize this component with a custom equality check.
// not doing results in a lot of aborted requests in firefox, which in turn seem to lead to cache misses.
export const CardThumbnail = memo(
  (props: Props) => {
    const { card, className, suffix } = props;
    const { t } = useTranslation();

    const colorCls = getCardColor(card);

    const imageCode = useAgathaEasterEggTransform(
      `${card.code}${suffix ?? ""}`,
    );

    return (
      <div
        className={cx(
          css["thumbnail"],
          css[card.type_code],
          colorCls,
          className,
        )}
        key={card.code}
        data-testid="card-thumbnail"
        data-component="card-thumbnail"
      >
        <img
          alt={t("card_view.thumbnail", { code: card.code })}
          src={thumbnailUrl(imageCode)}
        />
      </div>
    );
  },
  (prev, next) => prev.card.code === next.card.code,
);
