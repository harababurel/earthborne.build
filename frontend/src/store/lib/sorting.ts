import {
  ASPECT_ORDER,
  CARD_TYPE_ORDER,
  type Card,
  type CardType,
} from "@arkham-build/shared";
import { displayAttribute, splitMultiValue } from "@/utils/card-utils";
import type { SortingType } from "../slices/lists.types";
import type { Metadata } from "../slices/metadata.types";

/**
 * Cards
 */

export const SORTING_TYPES: SortingType[] = [
  "cost",
  "cycle",
  "aspect",
  "name",
  "position",
  "type",
];

export type SortFunction = (a: Card, b: Card) => number;

export function sortAlphabeticalLatin(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function sortByName(collator: Intl.Collator) {
  return (a: Card, b: Card) =>
    collator.compare(displayAttribute(a, "name"), displayAttribute(b, "name"));
}

function sortByAspect(a: Card, b: Card) {
  return (
    ASPECT_ORDER.indexOf(
      a.aspect_requirement_type as (typeof ASPECT_ORDER)[number],
    ) -
    ASPECT_ORDER.indexOf(
      b.aspect_requirement_type as (typeof ASPECT_ORDER)[number],
    )
  );
}

export function sortByPosition(a: Card, b: Card) {
  return (a.set_position ?? 0) - (b.set_position ?? 0);
}

function sortByCycle(metadata: Metadata) {
  return (a: Card, b: Card) => {
    const packA = metadata.packs[a.pack_code];
    const packB = metadata.packs[b.pack_code];

    if (!packA || !packB) {
      return 0;
    }

    if (packA.chapter !== packB.chapter) {
      return (packA.chapter ?? 1) - (packB.chapter ?? 1);
    }

    const cycleA = metadata.cycles[packA.cycle_code];
    const cycleB = metadata.cycles[packB.cycle_code];

    if (!cycleA || !cycleB) {
      return 0;
    }

    return cycleA.position - cycleB.position;
  };
}

function sortByCost(a: Card, b: Card) {
  const aCost = a.energy_cost ?? -1;
  const bCost = b.energy_cost ?? -1;
  return aCost - bCost;
}

function sortByType(a: Card, b: Card) {
  return (
    CARD_TYPE_ORDER.indexOf(a.type_code as CardType) -
    CARD_TYPE_ORDER.indexOf(b.type_code as CardType)
  );
}

export function makeSortFunction(
  sortings: SortingType[],
  metadata: Metadata,
  collator: Intl.Collator,
): SortFunction {
  const sorts = sortings.map((sorting) => {
    switch (sorting) {
      case "name": {
        return sortByName(collator);
      }

      case "cycle": {
        return sortByCycle(metadata);
      }

      case "aspect": {
        return sortByAspect;
      }

      case "type": {
        return sortByType;
      }

      case "cost": {
        return sortByCost;
      }

      case "category": {
        return sortByCategory;
      }

      default: {
        return sortByPosition;
      }
    }
  });

  return (a: Card, b: Card) => {
    for (const sort of sorts) {
      const result = sort(a, b);
      if (result !== 0) return result;
    }

    return 0;
  };
}

/**
 * Encounter Sets — kept for metadata compatibility but ER has no encounter sets.
 */

export function sortByEncounterSet(
  metadata: Metadata,
  collator: Intl.Collator,
) {
  return (a: string, b: string) => {
    const setA = metadata.encounterSets[a];
    const setB = metadata.encounterSets[b];
    if (!setA || !setB) return 0;

    const packA = metadata.packs[setA.pack_code];
    const packB = metadata.packs[setB.pack_code];
    if (!packA || !packB) return 0;

    const cycleA = metadata.cycles[packA.cycle_code];
    const cycleB = metadata.cycles[packB.cycle_code];
    if (!cycleA || !cycleB) return 0;

    return (
      cycleA.position - cycleB.position ||
      packA.position - packB.position ||
      (setA.position ?? 0) - (setB.position ?? 0) ||
      collator.compare(setA.name, setB.name)
    );
  };
}

/**
 * Slots — stub: ER has no slot system.
 */

export function sortBySlots(collator: Intl.Collator) {
  return (a: string, b: string) => collator.compare(a, b);
}

/**
 * Types
 */

export function sortTypesByOrder(a: string, b: string) {
  return (
    CARD_TYPE_ORDER.indexOf(a as CardType) -
    CARD_TYPE_ORDER.indexOf(b as CardType)
  );
}

export function sortNumerical(a: number, b: number) {
  return a - b;
}

export function sortByAspectOrder(a: string, b: string) {
  return (
    ASPECT_ORDER.indexOf(a as (typeof ASPECT_ORDER)[number]) -
    ASPECT_ORDER.indexOf(b as (typeof ASPECT_ORDER)[number])
  );
}

// Keep legacy name as alias for callers that used the old AH name.
export const sortByFactionOrder = sortByAspectOrder;

function sortByCategory(a: Card, b: Card) {
  const RANKING = [
    "personality",
    "background",
    "specialty",
    "reward",
    "malady",
    null,
    undefined,
  ];
  return (
    RANKING.indexOf(a.category as string) -
    RANKING.indexOf(b.category as string)
  );
}

/**
 * Helpers for multi-value string fields (traits, etc.)
 */
export { splitMultiValue };
