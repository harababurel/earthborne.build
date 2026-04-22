import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { CardText } from "@/components/card/card-text";
import { CardScan } from "@/components/card-scan";
import { AspectIcon } from "@/components/icons/aspect-icon";
import { Plane } from "@/components/ui/plane";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import type { History } from "@/store/selectors/decks";
import { selectMetadata } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { useAccentColor } from "@/utils/use-accent-color";
import type { DeckDisplayType } from "./deck-display";
import css from "./sidebar.module.css";
import type { DeckOrigin } from "./types";

type Props = {
  className?: string;
  deck: ResolvedDeck;
  history?: History;
  innerClassName?: string;
  origin: DeckOrigin;
  type: DeckDisplayType;
};

export default function Sidebar({ className, deck, innerClassName }: Props) {
  const { t } = useTranslation();
  const metadata = useStore(selectMetadata);
  const roleCard = metadata.cards[deck.role_code];
  const aspectCard = metadata.cards[deck.aspect_code];
  const cssVariables = useAccentColor(roleCard);

  const outsideInterestCard = useMemo(() => {
    return Object.values(deck.cards.slots).find(({ card }) => {
      if (card.is_expert) return false;
      if (card.category === "background") {
        return !!deck.background && card.background_type !== deck.background;
      }
      if (card.category === "specialty") {
        return !!deck.specialty && card.specialty_type !== deck.specialty;
      }
      return false;
    })?.card;
  }, [deck]);

  return (
    <aside className={cx(css["container"], className)} style={cssVariables}>
      <div className={cx(css["sidebar-inner"], innerClassName)}>
        <Plane className={css["section"]}>
          <h2 className={css["section-title"]}>
            {t("deck_create.steps.role")}
          </h2>
          <div className={css["card-info"]}>
            <h3 className={css["card-name"]}>{roleCard?.name}</h3>
            {roleCard && (
              <CardScan
                card={roleCard}
                className={css["card-scan"]}
                hideFlipButton
                lazy
              />
            )}
            <CardText
              size="full"
              text={roleCard?.text ?? undefined}
              typeCode={roleCard?.type_code ?? ""}
            />
          </div>
        </Plane>

        <Plane className={css["section"]}>
          <h2 className={css["section-title"]}>
            {t("deck_create.steps.aspect")}
          </h2>
          <div className={css["card-info"]}>
            <div className={css["aspect-stats"]}>
              <div className={css["stat-item"]}>
                <div className={cx(css["aspect-square"], css["awa"])}>
                  <AspectIcon
                    aspect="AWA"
                    className={css["white-icon"]}
                    size="3rem"
                  />
                  <div className={css["stat-overlay"]}>
                    <span className={css["stat-value"]}>
                      {aspectCard?.aspect_awareness}
                    </span>
                    <span className={css["stat-label"]}>AWA</span>
                  </div>
                </div>
              </div>
              <div className={css["stat-item"]}>
                <div className={cx(css["aspect-square"], css["spi"])}>
                  <AspectIcon
                    aspect="SPI"
                    className={css["white-icon"]}
                    size="3rem"
                  />
                  <div className={css["stat-overlay"]}>
                    <span className={css["stat-value"]}>
                      {aspectCard?.aspect_spirit}
                    </span>
                    <span className={css["stat-label"]}>SPI</span>
                  </div>
                </div>
              </div>
              <div className={css["stat-item"]}>
                <div className={cx(css["aspect-square"], css["fit"])}>
                  <AspectIcon
                    aspect="FIT"
                    className={css["white-icon"]}
                    size="3rem"
                  />
                  <div className={css["stat-overlay"]}>
                    <span className={css["stat-value"]}>
                      {aspectCard?.aspect_fitness}
                    </span>
                    <span className={css["stat-label"]}>FIT</span>
                  </div>
                </div>
              </div>
              <div className={css["stat-item"]}>
                <div className={cx(css["aspect-square"], css["foc"])}>
                  <AspectIcon
                    aspect="FOC"
                    className={css["white-icon"]}
                    size="3rem"
                  />
                  <div className={css["stat-overlay"]}>
                    <span className={css["stat-value"]}>
                      {aspectCard?.aspect_focus}
                    </span>
                    <span className={css["stat-label"]}>FOC</span>
                  </div>
                </div>
              </div>
            </div>
            <CardText
              size="full"
              text={aspectCard?.text ?? undefined}
              typeCode={aspectCard?.type_code ?? ""}
            />
          </div>
        </Plane>

        <Plane className={css["section"]}>
          <h2 className={css["section-title"]}>
            {t("deck_create.steps.review")}
          </h2>
          <div className={css["identity-info"]}>
            <div className={css["identity-item"]}>
              <span className={css["identity-label"]}>
                {t("deck_create.steps.background")}:
              </span>
              <span className={css["identity-value"]}>
                {t(`common.set.${deck.background}`)}
              </span>
            </div>
            <div className={css["identity-item"]}>
              <span className={css["identity-label"]}>
                {t("deck_create.steps.specialty")}:
              </span>
              <span className={css["identity-value"]}>
                {t(`common.set.${deck.specialty}`)}
              </span>
            </div>
            {outsideInterestCard && (
              <div className={css["identity-item"]}>
                <span className={css["identity-label"]}>
                  {t("deck_create.steps.outside_interest")}:
                </span>
                <span className={css["identity-value"]}>
                  <Link
                    className={css["card-link"]}
                    href={`/card/${outsideInterestCard.code}`}
                  >
                    {outsideInterestCard.name}
                  </Link>
                </span>
              </div>
            )}
          </div>
        </Plane>
      </div>
    </aside>
  );
}
