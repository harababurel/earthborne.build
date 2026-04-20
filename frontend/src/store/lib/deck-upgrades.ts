/**
 * ER has no XP upgrade system. All upgrade-related logic in this file is
 * stubbed to return zero/empty values. The types are kept for call-site
 * compatibility with the deck history and deck edit pages.
 */
import type { ResolvedDeck } from "./types";

type DeckChanges = {
  slots: Record<string, number>;
  extraSlots: Record<string, number>;
  customizations: Record<string, never[]>;
};

// Stub type — ER has no XP upgrade modifiers.
export type Modifier =
  | "adaptable"
  | "arcaneResearch"
  | "dejaVu"
  | "downTheRabbitHole";

type ModifierStats = Record<Modifier, { used: number; available: number }>;

export type ChangeStats = {
  changes: DeckChanges;
  xpAvailable?: number;
  xpAdjustment?: number;
  xpSpent?: number;
  xp?: number;
  modifierStats?: Partial<ModifierStats>;
};

export type UpgradeStats = {
  changes: DeckChanges;
  xpAvailable: number;
  xpAdjustment: number;
  xpSpent: number;
  xp: number;
  modifierStats: Partial<ModifierStats>;
};

function deckChanges(prev: ResolvedDeck, next: ResolvedDeck): DeckChanges {
  const slotDiff = (
    prevSlots: Record<string, unknown>,
    nextSlots: Record<string, unknown>,
  ) => {
    const diff: Record<string, number> = {};
    const codes = new Set([
      ...Object.keys(prevSlots),
      ...Object.keys(nextSlots),
    ]);
    for (const code of codes) {
      const prevQ = code in prevSlots ? 1 : 0;
      const nextQ = code in nextSlots ? 1 : 0;
      if (prevQ !== nextQ) diff[code] = nextQ - prevQ;
    }
    return diff;
  };

  return {
    slots: slotDiff(prev.slots ?? {}, next.slots ?? {}),
    extraSlots: slotDiff(prev.extraSlots ?? {}, next.extraSlots ?? {}),
    customizations: {},
  };
}

export function getChangeStats(
  prev: ResolvedDeck,
  next: ResolvedDeck,
  omitUpgradeStats = false,
): ChangeStats {
  const changes = deckChanges(prev, next);
  if (omitUpgradeStats) return { changes };

  return {
    changes,
    xpAvailable: 0,
    xpAdjustment: 0,
    xpSpent: 0,
    xp: 0,
    modifierStats: {},
  };
}
