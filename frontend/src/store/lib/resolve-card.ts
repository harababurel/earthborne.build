import { official } from "@/utils/card-utils";
import { CARD_SET_ORDER } from "@/utils/constants";
import type { StoreState } from "../slices";
import { applyCardChanges } from "./card-edits";
import type { LookupTables } from "./lookup-tables.types";
import { makeSortFunction } from "./sorting";
import type { CardWithRelations, Customizations, ResolvedCard } from "./types";

/**
 * Given a card code, resolve the card and its relations for display.
 */
export function resolveCardWithRelations<T extends boolean>(
  deps: Pick<StoreState, "metadata"> & { lookupTables: LookupTables },
  collator: Intl.Collator,
  code: string | undefined,
  tabooSetId: number | null | undefined,
  customizations?: Customizations,
  withRelations?: T,
): T extends true ? CardWithRelations | undefined : ResolvedCard | undefined {
  if (!code) return undefined;

  let card = deps.metadata.cards[code];
  if (!card) return undefined;

  card = applyCardChanges(card, deps.metadata, tabooSetId, customizations);

  const pack = deps.metadata.packs[card.pack_code];
  const type = deps.metadata.types[card.type_code];
  const cycle = pack ? deps.metadata.cycles[pack.cycle_code] : undefined;

  const cardWithRelations: CardWithRelations = {
    back: undefined,
    card,
    cycle,
    encounterSet: undefined,
    pack,
    subtype: undefined,
    type,
  };

  if (withRelations) {
    cardWithRelations.relations = {
      duplicates: resolveRelationArray(
        deps,
        collator,
        "duplicates",
        card.code,
        tabooSetId,
        customizations,
        false,
      ),
      reprints: resolveRelationArray(
        deps,
        collator,
        "reprints",
        card.code,
        tabooSetId,
        customizations,
        false,
      ),
      bound: resolveRelationArray(
        deps,
        collator,
        "bound",
        card.code,
        tabooSetId,
      ),
      bonded: resolveRelationArray(
        deps,
        collator,
        "bonded",
        card.code,
        tabooSetId,
      ),
    };
  }

  return cardWithRelations;
}

function resolveRelationArray(
  deps: Pick<StoreState, "metadata"> & { lookupTables: LookupTables },
  collator: Intl.Collator,
  key: keyof LookupTables["relations"],
  code: string,
  tabooSetId: number | null | undefined,
  customizations?: Customizations,
  _ignoreDuplicates = true,
): ResolvedCard[] {
  const { metadata, lookupTables } = deps;

  const relation = lookupTables.relations[key];

  const relations = relation[code]
    ? Object.keys(relation[code]).reduce<CardWithRelations[]>((acc, code) => {
        const card = resolveCardWithRelations(
          deps,
          collator,
          code,
          tabooSetId,
          customizations,
          false,
        );

        if (card) {
          acc.push(card);
        }

        return acc;
      }, [])
    : [];

  const sortFn = makeSortFunction(["type", "name"], metadata, collator);

  relations.sort((a, b) => sortFn(a.card, b.card));
  return relations;
}

function sortRelations(a: string, b: string) {
  return CARD_SET_ORDER.indexOf(a) - CARD_SET_ORDER.indexOf(b);
}

export function getRelatedCards(
  cardWithRelations: CardWithRelations,
  showFanMadeRelations: boolean,
) {
  return Object.entries(cardWithRelations.relations ?? {})
    .reduce(
      (acc, [key, value]) => {
        if (key === "duplicates" || key === "reprints") return acc;

        const values = (Array.isArray(value) ? value : [value]).filter((v) => {
          if (!v) return false;
          return showFanMadeRelations || official(v.card);
        });

        if (values.length > 0) {
          acc.push([key, Array.isArray(value) ? values : values[0]]);
        }

        return acc;
      },
      [] as [string, ResolvedCard | ResolvedCard[]][],
    )
    .sort((a, b) => sortRelations(a[0], b[0]));
}

export function getRelatedCardQuantity(
  key: string,
  set: ResolvedCard | ResolvedCard[],
) {
  const cards = Array.isArray(set) ? set : [set];
  const canShowQuantity = key !== "level" && key !== "restrictedTo";

  return canShowQuantity
    ? cards.reduce<Record<string, number>>((acc, { card }) => {
        acc[card.code] = card.quantity;
        return acc;
      }, {})
    : undefined;
}
