import type { Card } from "../schemas/card.schema.ts";
import type { ApproachKey, AspectKey } from "./constants.ts";

export function cardEnergyCost(card: Card): number {
  return card.energy_cost ?? 0;
}

export function cardAspectRequirement(
  card: Card,
): { aspect: AspectKey; value: number } | undefined {
  if (card.aspect_requirement_type && card.aspect_requirement_value) {
    return {
      aspect: card.aspect_requirement_type,
      value: card.aspect_requirement_value,
    };
  }
  return undefined;
}

export function cardApproachIcons(
  card: Card,
): Partial<Record<ApproachKey, number>> {
  const icons: Partial<Record<ApproachKey, number>> = {};
  if (card.approach_conflict) icons.conflict = card.approach_conflict;
  if (card.approach_reason) icons.reason = card.approach_reason;
  if (card.approach_exploration) icons.exploration = card.approach_exploration;
  if (card.approach_connection) icons.connection = card.approach_connection;
  return icons;
}
