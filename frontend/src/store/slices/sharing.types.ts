import type { Deck, Id } from "@earthborne-build/shared";
import type { DeckDisplayType } from "@/components/deck-display/deck-display";
import type { ResolvedDeck } from "../lib/types";

type SharingState = {
  decks: Record<string, string>; // <id, date_update>
  listed: Record<string, boolean>;
};

export type SharingSlice = {
  sharing: SharingState;
  createShare: (id: string, listed?: boolean) => Promise<void>;
  deleteShare: (id: string) => Promise<void>;
  deleteAllShares: () => Promise<void>;
  importSharedDeck: (deck: ResolvedDeck, type: DeckDisplayType) => Promise<Id>;
  setShareListed: (id: string, listed: boolean) => Promise<void>;
  updateShare: (deck: Deck) => Promise<Id | undefined>;
};
