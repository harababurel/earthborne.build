import type { Card } from "@earthborne-build/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { parseCardTextHtml } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { CardScan } from "../card-scan";
import { CardThumbnail } from "../card-thumbnail";
import css from "./card.module.css";
import { CardHeader } from "./card-header";
import { hasLocationBack } from "./location-back.helpers";

type Props = {
  card: Card;
  size: "compact" | "tooltip" | "full";
};

export function LocationBackFace(props: Props) {
  const { card, size } = props;
  const { t } = useTranslation();

  const backCard = useMemo(() => {
    return {
      ...card,
      name: t("card.location_back.title", { name: card.name }),
      flavor: "",
      text: "",
      traits: "",
    };
  }, [card, t]);

  if (!hasLocationBack(card)) return null;

  const showImage = !!card.back_image_url;

  return (
    <article
      className={cx(
        css["card"],
        css["back"],
        css["back-has-header"],
        css["location"],
        showImage && css["has-image"],
        css[size],
      )}
      data-testid="card-location-back"
    >
      <CardHeader card={backCard} />

      <div className={css["content"]}>
        <LocationBackContent card={card} />
      </div>

      {showImage && (
        <div className={css["image"]}>
          {size === "full" ? (
            <CardScan card={card} suffix="b" preventFlip />
          ) : (
            <CardThumbnail card={card} suffix="b" />
          )}
        </div>
      )}
    </article>
  );
}

function LocationBackContent(props: { card: Card }) {
  const { card } = props;
  const { t } = useTranslation();

  return (
    <section
      className={cx(
        css["location-back"],
        card.campaign_guide_entry != null && css["location-back-has-guide"],
      )}
    >
      {card.campaign_guide_entry != null && (
        <p className={css["location-back-guide"]}>
          <span className={css["location-back-guide-label"]}>
            <span className="core-guide" />
            {t("card.location_back.guide_entry", {
              entry: card.campaign_guide_entry,
            })}
          </span>
        </p>
      )}
      {card.path_deck_assembly && (
        <LocationBackEntry
          label={t("card.location_back.path_deck_assembly")}
          text={card.path_deck_assembly}
        />
      )}
      {card.arrival_setup && (
        <LocationBackEntry
          label={t("card.location_back.arrival_setup")}
          text={card.arrival_setup}
        />
      )}
    </section>
  );
}

function LocationBackEntry(props: { label: string; text: string }) {
  return (
    <div className={css["location-back-entry"]}>
      <h3>{props.label}</h3>
      <div className={css["location-back-text"]}>
        <p
          // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is from trusted card data.
          dangerouslySetInnerHTML={{
            __html: parseCardTextHtml(props.text, {
              bullets: true,
            }),
          }}
        />
      </div>
    </div>
  );
}
