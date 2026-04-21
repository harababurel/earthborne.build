import type { Card } from "../schemas/card.schema.ts";
import type { ApproachKey, AspectKey } from "./constants.ts";

// Stub — ER has no XP system; callers checking upgrade costs always get 0.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function countExperience(_card: Card, _quantity: number): number {
  return 0;
}

// Stub — ER has no card level (XP) system.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function cardLevel(_card: Card): number {
  return 0;
}

// Stub — ER has no skill icons; empty array prevents iteration errors.
export const SKILL_KEYS: string[] = [];

// Stub — ER has no card level (XP) system.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function realCardLevel(_card: Card): number {
  return 0;
}

// Stub — ER has no XP max for search; 0 prevents range filter errors.
export const DECKLIST_SEARCH_MAX_XP = 0;

// Stub — ER has no slot system; empty array prevents iteration errors.
export const ASSET_SLOT_ORDER: string[] = [];

// Stub — ER uses aspects, not factions; empty array prevents iteration errors.
export const FACTION_ORDER: string[] = [];

// Stub — ER has different card types; empty array prevents iteration errors.
export const PLAYER_TYPE_ORDER: string[] = [];

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
