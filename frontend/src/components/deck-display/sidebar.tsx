import { useTranslation } from "react-i18next";
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
            <h3 className={css["card-name"]}>{aspectCard?.name}</h3>
            {aspectCard && (
              <CardScan
                card={aspectCard}
                className={css["card-scan"]}
                hideFlipButton
                lazy
              />
            )}
            <div className={css["aspect-stats"]}>
              <div className={css["stat-item"]}>
                <AspectIcon aspect="AWA" size="1.25rem" />
                <span className={css["stat-value"]}>
                  {aspectCard?.aspect_awareness}
                </span>
              </div>
              <div className={css["stat-item"]}>
                <AspectIcon aspect="FIT" size="1.25rem" />
                <span className={css["stat-value"]}>
                  {aspectCard?.aspect_fitness}
                </span>
              </div>
              <div className={css["stat-item"]}>
                <AspectIcon aspect="FOC" size="1.25rem" />
                <span className={css["stat-value"]}>
                  {aspectCard?.aspect_focus}
                </span>
              </div>
              <div className={css["stat-item"]}>
                <AspectIcon aspect="SPI" size="1.25rem" />
                <span className={css["stat-value"]}>
                  {aspectCard?.aspect_spirit}
                </span>
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
          </div>
        </Plane>
      </div>
    </aside>
  );
}
