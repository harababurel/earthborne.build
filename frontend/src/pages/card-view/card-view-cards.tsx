import type { Card as CardType } from "@earthborne-build/shared";
import { ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import { useMemo } from "react";
import { Link, useSearchParams } from "wouter";
import { Card } from "@/components/card/card";
import { OwnershipPartitionedCardList } from "@/components/ownership-partitioned-card-list";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import { filterBacksides } from "@/store/lib/filtering";
import { getRelatedCards } from "@/store/lib/resolve-card";
import { sortByPosition } from "@/store/lib/sorting";
import type { CardWithRelations } from "@/store/lib/types";
import { selectLookupTables, selectMetadata } from "@/store/selectors/shared";
import {
  cardUrl,
  displayAttribute,
  oldFormatCardUrl,
  parseCardTitle,
} from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { displayPackName, formatRelationTitle } from "@/utils/formatting";
import { and } from "@/utils/fp";
import { isEmpty } from "@/utils/is-empty";
import css from "./card-view.module.css";

type Props = {
  title: string;
  children: React.ReactNode;
  id?: string;
};

function CardViewSection(props: Props) {
  const { title, children, id } = props;

  return (
    <section className={css["view-section"]} id={id} data-testid={id}>
      <h2 className={css["view-section-title"]}>{title}</h2>
      <div className={css["view-section-cards"]}>{children}</div>
    </section>
  );
}

function CardSetNav(props: { currentCard: CardWithRelations }) {
  const { currentCard } = props;

  const metadata = useStore(selectMetadata);
  const _lookupTables = useStore(selectLookupTables);

  const [search] = useSearchParams();
  const oldFormat = search.get("old_format") === "true";

  const targetPack = useMemo(() => {
    const currentCardPackCode = currentCard.card.pack_code;

    const currentPack = metadata.packs[currentCardPackCode];
    const targetPack = currentPack;

    if (!oldFormat) {
      // ER has no reprint packs.
    }

    return targetPack;
  }, [currentCard.card.pack_code, metadata.packs, oldFormat]);

  const filteredCards = useMemo(
    () =>
      Object.values(metadata.cards)
        .filter(
          and([
            filterBacksides,
            (card) => card.pack_code === targetPack.code,
            (card) =>
              !currentCard.card.set_code ||
              card.set_code === currentCard.card.set_code,
          ]),
        )
        .sort(sortByPosition),
    [metadata.cards, targetPack, currentCard.card.set_code],
  );

  const cardListIndex = filteredCards.findIndex(
    (card) => card.code === currentCard.card.code,
  );

  const setDisplay = currentCard.encounterSet
    ? currentCard.encounterSet.name
    : currentCard.card.set_code;

  const setLink = currentCard.card.set_code && (
    <a
      className="link-current"
      href={`/browse/pack/${targetPack.code}?set=${currentCard.card.set_code}`}
      target="_blank"
      rel="noreferrer"
    >
      {setDisplay}
    </a>
  );

  return (
    <div>
      <div className={css["card-set-nav-title"]}>
        <h3>
          {displayPackName(targetPack)}
          {setDisplay && (
            <>
              <small>&nbsp;&gt;&nbsp;</small>
              {setLink || setDisplay}
            </>
          )}
        </h3>
      </div>
      <div className={css["card-set-nav-container"]}>
        <CardSetLink
          shift={-1}
          cardListIndex={cardListIndex}
          filteredCards={filteredCards}
          oldFormat={oldFormat}
        />
        <CardSetLink
          shift={1}
          cardListIndex={cardListIndex}
          filteredCards={filteredCards}
          oldFormat={oldFormat}
        />
      </div>
    </div>
  );
}

function CardSetLink(props: {
  cardListIndex: number;
  filteredCards: CardType[];
  oldFormat: boolean;
  shift: number;
}) {
  const { shift, cardListIndex, filteredCards, oldFormat } = props;

  const targetCard = filteredCards[cardListIndex + shift];

  if (targetCard) {
    const url = oldFormat ? oldFormatCardUrl(targetCard) : cardUrl(targetCard);

    return (
      <Link to={url} asChild>
        <Button
          className={cx(
            css["card-set-button"],
            shift < 0 ? css["prev"] : css["next"],
          )}
          as="a"
        >
          {shift < 0 && <ChevronsLeftIcon />}
          <span
            // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted origin.
            dangerouslySetInnerHTML={{
              __html: parseCardTitle(displayAttribute(targetCard, "name")),
            }}
          />
          {shift > 0 && <ChevronsRightIcon />}
        </Button>
      </Link>
    );
  }
}

export function CardViewCards({
  cardWithRelations,
}: {
  cardWithRelations: CardWithRelations;
}) {
  const _settings = useStore((state) => state.settings);
  const related = getRelatedCards(cardWithRelations);

  return (
    <>
      <CardSetNav currentCard={cardWithRelations} />
      <div data-testid="main">
        <Card resolvedCard={cardWithRelations}>
          {/* ER has no customizations */}
        </Card>
      </div>

      {!isEmpty(related) &&
        related.map(([key, value]) => {
          return (
            <CardViewSection
              key={key}
              id={key}
              title={formatRelationTitle(key)}
            >
              <OwnershipPartitionedCardList
                cards={value}
                cardRenderer={(c) => (
                  <Card
                    canToggleBackside
                    key={c.card.code}
                    titleLinks="card"
                    resolvedCard={c}
                    size="compact"
                  />
                )}
              />
            </CardViewSection>
          );
        })}
    </>
  );
}
