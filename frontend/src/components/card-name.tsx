import { type Card, cardLevel } from "@arkham-build/shared";
import { useStore } from "@/store";
import { selectMetadata } from "@/store/selectors/shared";
import {
  cycleOrPack,
  displayAttribute,
  parseCardTextHtml,
} from "@/utils/card-utils";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { cx } from "@/utils/cx";
import css from "./card-name.module.css";
import { ExperienceDots } from "./experience-dots";
import PackIcon from "./icons/pack-icon";

interface Props {
  card: Card;
  children?: React.ReactNode;
  cardLevelDisplay: "icon-only" | "dots" | "text";
  cardShowCollectionNumber?: boolean;
  cardShowUniqueIcon?: boolean;
  className?: string;
  invert?: boolean;
}

export function CardName(props: Props) {
  const {
    card,
    cardLevelDisplay,
    cardShowCollectionNumber,
    cardShowUniqueIcon,
    children,
    className,
    invert,
  } = props;
  const level = cardLevel(card);

  return (
    <div className={cx(css["name"], className)} data-testid="card-name-inner">
      {cardShowUniqueIcon && !!card.is_unique && (
        <i className={cx(css["unique"], "icon-unique")} />
      )}
      {children}
      <span
        // biome-ignore lint/security/noDangerouslySetInnerHtml: safe.
        dangerouslySetInnerHTML={{
          __html: parseCardTextHtml(displayAttribute(card, "name"), {
            bullets: false,
          }),
        }}
      />
      {!!level && cardLevelDisplay === "dots" && <ExperienceDots xp={level} />}
      {level != null && cardLevelDisplay === "text" && (
        <span className={css["xp"]}>({level})</span>
      )}
      {cardShowCollectionNumber &&
        card.code !== SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS && (
          <CardPackDetail card={card} invert={invert} />
        )}
    </div>
  );
}

function CardPackDetail(props: { card: Card; invert?: boolean }) {
  const { card, invert } = props;

  const metadata = useStore(selectMetadata);

  const pack = metadata.packs[card.pack_code];
  const cycle = metadata.cycles[pack.cycle_code];
  const displayPack = cycleOrPack(cycle, pack);
  const set = card.set_code ? metadata.encounterSets[card.set_code] : undefined;
  const setDisplay = set ? set.name : card.set_code;

  const setLink = card.set_code && (
    <a
      className="link-current"
      href={`/browse/pack/${pack.code}?set=${card.set_code}`}
      target="_blank"
      rel="noreferrer"
    >
      {setDisplay}
    </a>
  );

  return (
    <span className={cx(css["pack-detail"], invert && css["invert"])}>
      <PackIcon
        className={css["pack-detail-icon"]}
        code={displayPack.code}
        invert={invert}
      />{" "}
      {setDisplay && <small>{setLink || setDisplay}</small>}
      <span className={css["pack-detail-position"]}>
        <small>&nbsp;#</small>
        {card.set_position}
      </span>
    </span>
  );
}
