import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { CardText } from "@/components/card/card-text";
import { CardScan } from "@/components/card-scan";
import { PortaledCardTooltip } from "@/components/card-tooltip/card-tooltip-portaled";
import { AspectIcon } from "@/components/icons/aspect-icon";
import { Plane } from "@/components/ui/plane";
import { DefaultTooltip } from "@/components/ui/tooltip";
import { useRestingTooltip } from "@/components/ui/tooltip.hooks";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import type { History } from "@/store/selectors/decks";
import { selectMetadata } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { isEvolvedDeck } from "@/utils/deck-utils";
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

  const { refs, referenceProps, isMounted, floatingStyles, transitionStyles } =
    useRestingTooltip();

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

        <Plane className={css["combined-section"]}>
          <div className={css["column"]}>
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
                      size="3.75rem"
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
                      size="3.75rem"
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
                      size="3.75rem"
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
                      size="3.75rem"
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
          </div>

          <div className={css["divider"]} />

          <div className={css["column"]}>
            <h2 className={css["section-title"]}>
              {t("deck_create.steps.review")}
            </h2>
            <div className={css["identity-info"]}>
              <div className={css["identity-item"]}>
                <span className={css["identity-label"]}>
                  {t("deck.evolution.status")}
                </span>
                <span className={css["identity-value"]}>
                  <DefaultTooltip
                    tooltip={t(
                      `deck.evolution.${
                        isEvolvedDeck(deck) ? "evolved" : "starter"
                      }_description`,
                    )}
                  >
                    <span className={css["status-value"]}>
                      {t(
                        `deck.evolution.${
                          isEvolvedDeck(deck) ? "evolved" : "starter"
                        }`,
                      )}
                    </span>
                  </DefaultTooltip>
                </span>
              </div>
              <div className={css["identity-item"]}>
                <span className={css["identity-label"]}>
                  {t("deck_create.steps.background")}
                </span>
                <span className={css["identity-value"]}>
                  <DefaultTooltip
                    tooltip={t(
                      `deck_create.background_type_description.${deck.background}`,
                    )}
                  >
                    <span className={css["status-value"]}>
                      {t(`common.set.${deck.background}`)}
                    </span>
                  </DefaultTooltip>
                </span>
              </div>
              <div className={css["identity-item"]}>
                <span className={css["identity-label"]}>
                  {t("deck_create.steps.specialty")}
                </span>
                <span className={css["identity-value"]}>
                  <DefaultTooltip
                    tooltip={t(
                      `deck_create.specialty_type_description.${deck.specialty}`,
                    )}
                  >
                    <span className={css["status-value"]}>
                      {t(`common.set.${deck.specialty}`)}
                    </span>
                  </DefaultTooltip>
                </span>
              </div>
              {outsideInterestCard && (
                <div className={css["identity-item"]}>
                  <span className={css["identity-label"]}>
                    {t("deck_create.steps.outside_interest")}
                  </span>
                  <span className={css["identity-value"]}>
                    <Link
                      {...referenceProps}
                      className={css["card-link"]}
                      href={`/card/${outsideInterestCard.code}`}
                      ref={refs.setReference}
                      style={{
                        color: outsideInterestCard.aspect_requirement_type
                          ? `var(--color-${outsideInterestCard.aspect_requirement_type.toLowerCase()})`
                          : undefined,
                      }}
                    >
                      {outsideInterestCard.name}
                    </Link>
                    {isMounted && (
                      <PortaledCardTooltip
                        card={outsideInterestCard}
                        ref={refs.setFloating}
                        floatingStyles={floatingStyles}
                        transitionStyles={transitionStyles}
                      />
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Plane>
      </div>
    </aside>
  );
}
