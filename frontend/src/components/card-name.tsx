import type { Card } from "@earthborne-build/shared";
import { useStore } from "@/store";
import { selectMetadata } from "@/store/selectors/shared";
import { displayAttribute, parseCardTextHtml } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import css from "./card-name.module.css";

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
    cardShowCollectionNumber,
    cardShowUniqueIcon,
    children,
    className,
    invert,
  } = props;

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
      {cardShowCollectionNumber && (
        <CardPackDetail card={card} invert={invert} />
      )}
    </div>
  );
}

function CardPackDetail(props: { card: Card; invert?: boolean }) {
  const { card, invert } = props;

  const metadata = useStore(selectMetadata);

  const pack = metadata.packs[card.pack_code];
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
      {setDisplay && <small>{setLink || setDisplay}</small>}
      {setDisplay && card.set_position && " · "}
      <span className={css["pack-detail-position"]}>
        {card.set_position}
        {card.set_size ? ` of ${card.set_size}` : ""}
      </span>
    </span>
  );
}
