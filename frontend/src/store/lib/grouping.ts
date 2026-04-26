import { APPROACH_ORDER, type Card } from "@earthborne-build/shared";
import { displayPackName, shortenPackName } from "@/utils/formatting";
import i18n from "@/utils/i18n";
import type { GroupingType } from "../slices/lists.types";
import type { Metadata } from "../slices/metadata.types";
import {
  type SortFunction,
  sortByAspectOrder,
  sortByEncounterSet,
  sortNumerical,
  sortTypesByOrder,
} from "./sorting";

export const NONE = "none";

export const PLAYER_GROUPING_TYPES: GroupingType[] = [
  "category",
  "type",
  "aspect",
  "approach",
  "cost",
  "pack",
];

export const PATH_GROUPING_TYPES: GroupingType[] = [
  "type",
  "path_set",
  "pack",
];

type Key = string | number;

type Grouping<K extends Key = string> = {
  data: Record<K, Card[]>;
  groupings: K[];
  type: GroupingType;
};

export type GroupingResult = {
  cards: Card[];
  key: string;
  type: string;
};

type GroupTreeEntry = {
  key: string;
  type: string;
  count: number;
  parent: string | null;
};

export type GroupedCards = {
  data: GroupingResult[];
  hierarchy: Record<string, GroupTreeEntry>;
};

function toGroupingResult<K extends Key>(
  grouping: Grouping<K>,
): GroupingResult[] {
  return grouping.groupings.map((key) => ({
    cards: grouping.data[key],
    key: typeof key === "number" ? key.toString() : (key as string),
    type: grouping.type,
  }));
}

function omitEmptyGroupings<K extends Key>(grouping: Grouping<K>) {
  for (let i = 0; i < grouping.groupings.length; i++) {
    const key = grouping.groupings[i];

    if (!grouping.data[key].length) {
      delete grouping.data[key];
      grouping.groupings.splice(i, 1);
    } else {
      i++;
    }
  }
}

function groupByTypeCode(cards: Card[]) {
  const result = cards.reduce<Grouping>(
    (acc, card) => {
      const code = card.type_code;

      if (!acc.data[code]) {
        acc.data[code] = [card];
        acc.groupings.push(code);
      } else {
        acc.data[code].push(card);
      }

      return acc;
    },
    { data: {}, groupings: [], type: "type" },
  );

  omitEmptyGroupings(result);
  result.groupings.sort(sortTypesByOrder);

  return toGroupingResult(result);
}

function groupByAspect(cards: Card[]) {
  const results = cards.reduce<Grouping>(
    (acc, card) => {
      const aspect = card.energy_aspect ?? card.aspect_requirement_type ?? NONE;

      if (!acc.data[aspect]) {
        acc.data[aspect] = [card];
        acc.groupings.push(aspect);
      } else {
        acc.data[aspect].push(card);
      }

      return acc;
    },
    { data: {}, groupings: [], type: "aspect" },
  );

  omitEmptyGroupings(results);
  results.groupings.sort(sortByAspectOrder);

  return toGroupingResult(results);
}

function groupByCategory(cards: Card[]) {
  const CATEGORY_ORDER = [
    "personality",
    "background",
    "specialty",
    "reward",
    "malady",
  ];
  const results = cards.reduce<Grouping>(
    (acc, card) => {
      const category = card.category ?? NONE;

      if (!acc.data[category]) {
        acc.data[category] = [card];
        acc.groupings.push(category);
      } else {
        acc.data[category].push(card);
      }

      return acc;
    },
    { data: {}, groupings: [], type: "category" },
  );

  omitEmptyGroupings(results);
  results.groupings.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return toGroupingResult(results);
}

function groupByPathSet(
  cards: Card[],
  metadata: Metadata,
  collator: Intl.Collator,
) {
  const results = cards.reduce<Grouping>(
    (acc, card) => {
      const code = card.set_code ?? NONE;

      if (!acc.data[code]) {
        acc.data[code] = [card];
        acc.groupings.push(code);
      } else {
        acc.data[code].push(card);
      }

      return acc;
    },
    { data: {}, groupings: [], type: "path_set" },
  );

  omitEmptyGroupings(results);
  results.groupings.sort(sortByEncounterSet(metadata, collator));

  return toGroupingResult(results);
}

function dominantApproach(card: Card): string {
  const values: [string, number][] = APPROACH_ORDER.map((a) => [
    a,
    (card[`approach_${a}` as keyof Card] as number | null | undefined) ?? 0,
  ]);
  const max = Math.max(...values.map(([, v]) => v));
  if (max === 0) return NONE;
  const winner = values.find(([, v]) => v === max);
  return winner ? winner[0] : NONE;
}

function groupByApproach(cards: Card[]) {
  const results = cards.reduce<Grouping>(
    (acc, card) => {
      const approach = dominantApproach(card);

      if (!acc.data[approach]) {
        acc.data[approach] = [card];
        acc.groupings.push(approach);
      } else {
        acc.data[approach].push(card);
      }

      return acc;
    },
    { data: {}, groupings: [], type: "approach" },
  );

  omitEmptyGroupings(results);
  results.groupings.sort((a, b) => {
    const ai = APPROACH_ORDER.indexOf(a as (typeof APPROACH_ORDER)[number]);
    const bi = APPROACH_ORDER.indexOf(b as (typeof APPROACH_ORDER)[number]);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return toGroupingResult(results);
}

function groupByCost(cards: Card[]) {
  const results = cards.reduce<Grouping<number | string>>(
    (acc, card) => {
      const cost = card.energy_cost ?? NONE;

      if (!acc.data[cost]) {
        acc.data[cost] = [card];
        acc.groupings.push(cost);
      } else {
        acc.data[cost].push(card);
      }

      return acc;
    },
    { data: {}, groupings: [], type: "cost" },
  );

  omitEmptyGroupings(results);

  results.groupings.sort((a, b) =>
    a === NONE ? -1 : b === NONE ? 1 : sortNumerical(a as number, b as number),
  );

  return toGroupingResult(results);
}

function groupByCycle(cards: Card[], metadata: Metadata) {
  const chapterCycles: Record<string, number | undefined> = {};

  const results = cards.reduce<Grouping>(
    (acc, card) => {
      const pack = metadata.packs[card.pack_code];
      const cycle = metadata.cycles[pack?.cycle_code]?.code ?? NONE;

      if (!acc.data[cycle]) {
        acc.data[cycle] = [card];
        acc.groupings.push(cycle);
        chapterCycles[cycle] = pack?.chapter ?? undefined;
      } else {
        acc.data[cycle].push(card);
      }

      return acc;
    },
    { data: {}, groupings: [], type: "cycle" },
  );

  omitEmptyGroupings(results);

  results.groupings.sort((a, b) => {
    const aCycle = metadata.cycles[a];
    const bCycle = metadata.cycles[b];

    if (!aCycle || !bCycle) return 0;

    const aChapter = chapterCycles[a] ?? 1;
    const bChapter = chapterCycles[b] ?? 1;

    if (aChapter !== bChapter) {
      return aChapter - bChapter;
    }

    return aCycle.position - bCycle.position;
  });

  return toGroupingResult(results);
}

function groupByPack(cards: Card[], metadata: Metadata) {
  const results = cards.reduce<Grouping>(
    (acc, card) => {
      const pack = metadata.packs[card.pack_code];
      const packCode = pack?.code ?? card.pack_code;

      if (!acc.data[packCode]) {
        acc.data[packCode] = [card];
        acc.groupings.push(packCode);
      } else {
        acc.data[packCode].push(card);
      }

      return acc;
    },
    { data: {}, groupings: [], type: "pack" },
  );

  omitEmptyGroupings(results);

  results.groupings.sort((a, b) => {
    const packA = metadata.packs[a];
    const packB = metadata.packs[b];

    if (!packA || !packB) return 0;

    const aCycle = metadata.cycles[packA.cycle_code];
    const bCycle = metadata.cycles[packB.cycle_code];

    const aChapter = packA.chapter ?? 1;
    const bChapter = packB.chapter ?? 1;

    if (aChapter !== bChapter) {
      return aChapter - bChapter;
    }

    if (aCycle && bCycle && aCycle.position !== bCycle.position) {
      return aCycle.position - bCycle.position;
    }

    return packA.position - packB.position;
  });

  return toGroupingResult(results);
}

function applyGrouping(
  cards: Card[],
  grouping: GroupingType,
  metadata: Metadata,
  collator: Intl.Collator,
): GroupingResult[] {
  switch (grouping) {
    case "none": {
      return [
        {
          cards,
          key: "all",
          type: "none",
        },
      ];
    }
    case "type":
      return groupByTypeCode(cards);
    case "aspect":
      return groupByAspect(cards);
    case "approach":
      return groupByApproach(cards);
    case "category":
      return groupByCategory(cards);
    case "path_set":
      return groupByPathSet(cards, metadata, collator);
    case "cost":
      return groupByCost(cards);
    case "cycle":
      return groupByCycle(cards, metadata);
    case "pack":
      return groupByPack(cards, metadata);
  }
}

export function getGroupedCards(
  _groupings: GroupingType[],
  cards: Card[],
  sortFunction: SortFunction,
  metadata: Metadata,
  collator: Intl.Collator,
): GroupedCards {
  const groupings = _groupings.length ? _groupings : ["none" as const];

  const data = applyGrouping(cards, groupings[0], metadata, collator);

  const hierarchy: Record<string, GroupTreeEntry> = {};

  if (groupings.length > 1) {
    for (let i = 1; i < groupings.length; i++) {
      const grouping = groupings[i];

      let j = 0;

      while (j < data.length) {
        const group = data[j];

        const parent = group.key.includes("|")
          ? group.key.split("|").slice(0, -1).join("|")
          : null;

        hierarchy[group.key] = {
          key: group.key,
          type: group.type,
          count: group.cards.length,
          parent,
        };

        const expanded = applyGrouping(
          group.cards,
          grouping,
          metadata,
          collator,
        );

        for (const g of expanded) {
          g.key = `${group.key}|${g.key}`;
          g.type = `${group.type}|${g.type}`;

          hierarchy[g.key] = {
            key: g.key,
            type: g.type,
            count: g.cards.length,
            parent: group.key,
          };
        }

        data.splice(j, 1, ...expanded);

        j += expanded.length;
      }
    }
  } else {
    for (const group of data) {
      hierarchy[group.key] = {
        key: group.key,
        type: group.type,
        count: group.cards.length,
        parent: null,
      };
    }
  }

  for (const group of data) {
    group.cards.sort(sortFunction);
  }

  return { data, hierarchy };
}

export function getGroupingKeyLabel(
  type: string,
  segment: string,
  metadata: Metadata,
) {
  switch (type) {
    case "none": {
      return i18n.t("lists.all_cards");
    }

    case "type": {
      return i18n.t(`common.type.${segment}`, { count: 1 });
    }

    case "cycle": {
      return displayPackName(metadata.cycles[segment]) ?? "";
    }

    case "path_set": {
      if (segment === NONE) return "";
      return metadata.encounterSets[segment]?.name ?? segment;
    }

    case "cost": {
      if (segment === NONE) return i18n.t("common.cost.none");

      const cost = Number.parseInt(segment, 10);
      if (!Number.isFinite(cost)) return i18n.t("common.cost.none");

      if (cost <= -2) return i18n.t("common.cost.x");
      return i18n.t("common.cost.value", { cost: segment });
    }

    case "aspect": {
      if (segment === NONE) return i18n.t("common.none");
      return i18n.t(`common.factions.${segment.toLowerCase()}`);
    }

    case "approach": {
      if (segment === NONE) return i18n.t("common.none");
      return i18n.t(`common.skill.${segment}`);
    }

    case "category": {
      if (segment === NONE) return "";
      return i18n.t(`common.category.${segment}`);
    }

    case "pack": {
      return shortenPackName(metadata.packs[segment]) ?? "";
    }

    case "default": {
      return segment;
    }
  }

  return "";
}
