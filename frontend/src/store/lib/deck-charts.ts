import type { Card } from "@arkham-build/shared";
import { ASPECT_ORDER } from "@arkham-build/shared";
import { splitMultiValue } from "@/utils/card-utils";
import type { DeckCharts } from "./types";

export type ChartableData<T extends string | number = number> = {
  x: T;
  y: number;
}[];

export function emptyDeckCharts(): DeckCharts {
  return {
    costCurve: new Map(),
    skillIcons: new Map(),
    factions: new Map(ASPECT_ORDER.map((aspect) => [aspect, 0] as const)),
    traits: new Map(),
  };
}

export function addCardToDeckCharts(
  card: Card,
  quantity: number,
  accumulator: DeckCharts,
) {
  // Cost curve — use energy_cost
  if (typeof card.energy_cost === "number" && card.energy_cost >= 0) {
    const normalizedCost = card.energy_cost >= 7 ? 7 : card.energy_cost;
    const entry = accumulator.costCurve.get(normalizedCost) ?? 0;
    accumulator.costCurve.set(normalizedCost, entry + quantity);
  }

  // Aspects
  if (card.energy_aspect) {
    const entry = accumulator.factions.get(card.energy_aspect) ?? 0;
    accumulator.factions.set(card.energy_aspect, entry + quantity);
  }

  // Traits
  for (const trait of splitMultiValue(card.traits)) {
    const entry = accumulator.traits.get(trait) ?? 0;
    accumulator.traits.set(trait, entry + quantity);
  }
}

function sortByKey<T extends string | number>(
  [a]: [T, number],
  [b]: [T, number],
): number {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  return a.toString().localeCompare(b.toString());
}

function sortByValue<T extends string | number>(
  [_, a]: [T, number],
  [__, b]: [T, number],
): number {
  return b - a;
}

export function toChartableData<T extends number | string>(
  map: Map<T, number>,
  sortBy: "key" | "value" = "key",
): ChartableData<T> {
  return Array.from(map.entries())
    .sort(sortBy === "key" ? sortByKey : sortByValue)
    .map(([x, y]) => ({ x, y }));
}
