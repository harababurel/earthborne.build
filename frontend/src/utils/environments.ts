import type { Cycle } from "@/store/schemas/cycle.schema";
import type { Pack } from "@/store/schemas/pack.schema";
import type { Metadata } from "@/store/slices/metadata.types";

export const environments = {
  current() {
    return [];
  },
  limited(packs: string[]) {
    return packs;
  },
  cpa(_cycle: string) {
    return [];
  },
  currentFaq25(_cycles: Cycle[]) {
    return [];
  },
  limitedFaq25(_cycles: Cycle[]) {
    return [];
  },
};

export function resolveLimitedPoolPacks(
  metadata: Metadata,
  cardPool: string[] | undefined,
) {
  if (!cardPool) return [];

  const selectedPacks: Pack[] = [];
  const packs = Object.values(metadata.packs);

  for (const code of cardPool) {
    if (code.startsWith("cycle:")) {
      const cycleCode = code.replace("cycle:", "");
      const cycle = metadata.cycles[cycleCode];

      if (cycle) {
        const cyclePacks = packs
          .filter((p) => p.cycle_code === cycle.code)
          .sort((a, b) => a.position - b.position);

        selectedPacks.push(...cyclePacks);
      }
    } else if (!code.startsWith("card:")) {
      const pack = metadata.packs[code];
      if (pack) {
        selectedPacks.push(pack);
      }
    }
  }

  return selectedPacks;
}
