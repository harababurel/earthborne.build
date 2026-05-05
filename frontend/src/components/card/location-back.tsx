import type { Card } from "@earthborne-build/shared";
import { useTranslation } from "react-i18next";
import { parseCardTextHtml } from "@/utils/card-utils";
import css from "./card.module.css";

type Props = {
  card: Card;
  size: "compact" | "tooltip" | "full";
};

export function LocationBack(props: Props) {
  const { card, size } = props;
  const { t } = useTranslation();

  if (size === "tooltip" || card.category_id !== "location") return null;

  const hasBackText = !!(
    card.path_deck_assembly ||
    card.arrival_setup ||
    card.campaign_guide_entry
  );

  if (!hasBackText) return null;

  return (
    <section className={css["location-back"]}>
      <h2>{t("card.location_back.title")}</h2>
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
      {card.campaign_guide_entry != null && (
        <p className={css["location-back-guide"]}>
          <span className="core-guide" />
          {t("card.location_back.guide_entry", {
            entry: card.campaign_guide_entry,
          })}
        </p>
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
            __html: parseCardTextHtml(props.text, { bullets: true }),
          }}
        />
      </div>
    </div>
  );
}
