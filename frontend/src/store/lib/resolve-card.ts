import { official } from "@/utils/card-utils";
import { CARD_SET_ORDER } from "@/utils/constants";
import type { StoreState } from "../slices";
import { applyCardChanges } from "./card-edits";
import type { LookupTables } from "./lookup-tables.types";
import { makeSortFunction } from "./sorting";
import type { CardWithRelations, ResolvedCard } from "./types";

/**
 * Given a card code, resolve the card and its relations for display.
 */
export function resolveCardWithRelations<T extends boolean>(
  deps: Pick<StoreState, "metadata"> & { lookupTables: LookupTables },
  collator: Intl.Collator,
  code: string | undefined,
  withRelations?: T,
): T extends true ? CardWithRelations | undefined : ResolvedCard | undefined {
  if (!code) return undefined;

  let card = deps.metadata.cards[code];
  if (!card) return undefined;

  card = applyCardChanges(card, deps.metadata, undefined);

  const pack = deps.metadata.packs[card.pack_code];
  const type = deps.metadata.types[card.type_code];
  const cycle = pack ? deps.metadata.cycles[pack.cycle_code] : undefined;
  const encounterSet = card.set_code
    ? deps.metadata.encounterSets[card.set_code]
    : undefined;

  const cardWithRelations: CardWithRelations = {
    back: undefined,
    card,
    cycle,
    encounterSet,
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
        false,
      ),
      reprints: resolveRelationArray(
        deps,
        collator,
        "reprints",
        card.code,
        false,
      ),
      bound: resolveRelationArray(deps, collator, "bound", card.code),
    };
  }

  return cardWithRelations;
}

function resolveRelationArray(
  deps: Pick<StoreState, "metadata"> & { lookupTables: LookupTables },
  collator: Intl.Collator,
  key: keyof LookupTables["relations"],
  code: string,
  _ignoreDuplicates = true,
): ResolvedCard[] {
  const { metadata, lookupTables } = deps;

  const relation = lookupTables.relations[key];

  const relations = relation[code]
    ? Object.keys(relation[code]).reduce<CardWithRelations[]>((acc, code) => {
        const card = resolveCardWithRelations(deps, collator, code, false);

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

export function getRelatedCards(cardWithRelations: CardWithRelations) {
  return Object.entries(cardWithRelations.relations ?? {})
    .reduce(
      (acc, [key, value]) => {
        if (key === "duplicates" || key === "reprints") return acc;

        const values = (Array.isArray(value) ? value : [value]).filter((v) => {
          if (!v) return false;
          return official(v.card);
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
