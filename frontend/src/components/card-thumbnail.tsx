import type { Card } from "@earthborne-build/shared";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  cardFrontImageUrl,
  getCardColor,
  isLandscapeCard,
  thumbnailUrl,
} from "@/utils/card-utils";
import { cx } from "@/utils/cx";
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
    const useMiniRoleArt = useStore((state) => state.settings.useMiniRoleArt);

    const colorCls = getCardColor(card);

    const imageCode = `${card.code}${suffix ?? ""}`;
    const src = suffix
      ? thumbnailUrl(imageCode)
      : cardFrontImageUrl(card, useMiniRoleArt);

    return (
      <div
        className={cx(
          css["thumbnail"],
          css[card.type_code],
          isLandscapeCard(card) && css["landscape"],
          colorCls,
          className,
        )}
        key={card.code}
        data-testid="card-thumbnail"
        data-component="card-thumbnail"
      >
        <img alt={t("card_view.thumbnail", { code: card.code })} src={src} />
      </div>
    );
  },
  (prev, next) =>
    prev.card.code === next.card.code &&
    prev.card.alt_image_url === next.card.alt_image_url &&
    prev.suffix === next.suffix,
);
