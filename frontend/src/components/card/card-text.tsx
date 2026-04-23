import { PenLineIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { parseCardTextHtml } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { formatDate } from "@/utils/formatting";
import css from "./card.module.css";

type Props = {
  challengeCrest?: string | null;
  challengeMountain?: string | null;
  challengeSun?: string | null;
  errataDate?: string | null;
  flavor?: string;
  size: "full" | "compact" | "tooltip";
  text?: string;
  typeCode: string;
  victory?: number | null;
};

export function CardText(props: Props) {
  const {
    challengeCrest,
    challengeMountain,
    challengeSun,
    errataDate,
    flavor,
    size,
    text,
    typeCode,
    victory,
  } = props;
  const { t } = useTranslation();

  const swapFlavor = ["agenda", "act", "story"].includes(typeCode);

  const textNode = !!text && (
    <div className={css["text"]} data-testid="card-text">
      {text && (
        <p
          // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is from trusted source.
          dangerouslySetInnerHTML={{
            __html: parseCardTextHtml(text, { bullets: true }),
          }}
        />
      )}
      {victory != null && (
        <p>
          <b>
            {t("common.victory")} {victory}.
          </b>
        </p>
      )}
    </div>
  );

  const renderChallenge = (
    text: string,
    type: "sun" | "mountain" | "crest",
  ) => (
    <div className={cx(css.challenge, css[type])} key={type}>
      <div className={css["challenge-icon"]}>
        <i className={`core-${type}`} />
      </div>
      <div className={css["challenge-text"]}>
        <p
          // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is from trusted source.
          dangerouslySetInnerHTML={{
            __html: parseCardTextHtml(text, { bullets: true }),
          }}
        />
      </div>
    </div>
  );

  const challengesNode = (challengeSun ||
    challengeMountain ||
    challengeCrest) && (
    <div className={css.challenges}>
      {challengeSun && renderChallenge(challengeSun, "sun")}
      {challengeMountain && renderChallenge(challengeMountain, "mountain")}
      {challengeCrest && renderChallenge(challengeCrest, "crest")}
    </div>
  );

  const errataNode = !!errataDate && size !== "tooltip" && (
    <p className={css["errata"]}>
      <PenLineIcon />
      {t("card_view.errata_notice", {
        date: formatDate(errataDate),
      })}
    </p>
  );

  const flavorNode = !!flavor && size !== "tooltip" && (
    <div className={css["flavor"]}>
      <p
        // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is from trusted source.
        dangerouslySetInnerHTML={{
          __html: parseCardTextHtml(flavor, { bullets: false }),
        }}
      />
    </div>
  );

  if (!flavorNode && !textNode && !errataNode && !challengesNode) return null;

  return swapFlavor ? (
    <>
      {flavorNode}
      {textNode}
      {challengesNode}
      {errataNode}
    </>
  ) : (
    <>
      {textNode}
      {challengesNode}
      {errataNode}
      {flavorNode}
    </>
  );
}
