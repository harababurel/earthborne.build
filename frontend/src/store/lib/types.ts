import type { Card, Deck } from "@earthborne-build/shared";
import type { Cycle } from "../schemas/cycle.schema";
import type { EncounterSet } from "../schemas/encounter-set.schema";
import type { SubType, Type } from "../schemas/metadata.schema";
import type { Pack } from "../schemas/pack.schema";

export type Coded = {
  code: string;
};

export type ResolvedCard = {
  card: Card;
  back?: ResolvedCard;
  encounterSet?: EncounterSet;
  cycle: Cycle | undefined;
  pack: Pack | undefined;
  subtype?: SubType;
  type: Type | undefined;
};

export type CardWithRelations = ResolvedCard & {
  relations?: {
    bound?: ResolvedCard[];
    duplicates?: ResolvedCard[];
    reprints?: ResolvedCard[];
    otherVersions?: ResolvedCard[];
  };
};

export type DeckMeta = {
  banner_url?: string | null;
  intro_md?: string | null;
} & {
  [key in `annotation_${string}`]: string | null;
};

export type DeckCharts = {
  costCurve: Map<number, number>;
  approachIcons: Map<string, number>;
  aspects: Map<string, number>;
  traits: Map<string, number>;
};

export type Annotations = Record<string, string | null>;

export type ResolvedDeck = Deck & {
  annotations: Annotations;
  cards: {
    slots: Record<string, ResolvedCard>;
  };
  originalDeck: Deck;
  shared: boolean;
  stats: {
    deckSize: number;
    deckSizeTotal: number;
    charts: DeckCharts;
  };
};

export function isResolvedDeck(a: unknown): a is ResolvedDeck {
  return (a as ResolvedDeck)?.role_code != null;
}

export type DeckSummary = Pick<
  Deck,
  | "date_creation"
  | "date_update"
  | "id"
  | "name"
  | "problem"
  | "source"
  | "tags"
  | "slots"
  | "role_code"
  | "aspect_code"
> &
  Pick<ResolvedDeck, "shared"> & {
    stats: Omit<ResolvedDeck["stats"], "charts">;
  };

export type CardSet = {
  canSetQuantity?: boolean;
  canSelect?: boolean;
  cards: ResolvedCard[];
  id: string;
  quantities?: Record<string, number>;
  selected: boolean;
  title: string;
  help?: string;
};
