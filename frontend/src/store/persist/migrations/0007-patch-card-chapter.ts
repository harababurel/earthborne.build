import { inferCardChapter } from "@/store/lib/card-chapter";
import type { StoreState } from "@/store/slices";

function migrate(_state: unknown, version: number) {
  const state = _state as StoreState;

  if (version < 8) {
    const cards = state.metadata?.cards;
    const packs = state.metadata?.packs;

    if (!cards || !packs) {
      return state;
    }

    for (const card of Object.values(cards)) {
      (card as unknown as Record<string, unknown>).chapter = inferCardChapter(card.pack_code, packs);
    }
  }

  return state;
}

export default migrate;
