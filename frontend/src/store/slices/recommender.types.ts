import type { Id } from "@earthborne-build/shared";

export type RecommenderState = {
  recommender: {
    isRelative: boolean;
    deckFilter: [string, string];
    coreCards: { [id: Id]: string[] };
  };
};

export type RecommenderSlice = RecommenderState & {
  setIsRelative(value: boolean): void;
  setRecommenderDeckFilter(value: [string, string]): void;
  addCoreCard(deck: Id, value: string): void;
  removeCoreCard(deck: Id, value: string): void;
};
