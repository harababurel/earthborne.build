import type { Deck, Id } from "@earthborne-build/shared";
import type {
  AllCardResponse,
  DataVersionResponse,
  MetadataResponse,
} from "@/store/services/queries";
import type { StoreState } from ".";
import type { Locale } from "./settings.types";

type AppState = {
  clientId: string;
  bannersDismissed?: string[];
  starterDecksSeeded?: boolean;
};

export type AppSlice = {
  app: AppState;

  init(
    queryMetadata: (locale?: Locale) => Promise<MetadataResponse>,
    queryDataVersion: (locale?: Locale) => Promise<DataVersionResponse>,
    queryCards: (locale?: Locale) => Promise<AllCardResponse>,
    opts?: {
      locale?: Locale;
      overrides?: Partial<StoreState>;
      refresh?: boolean;
    },
  ): Promise<boolean>;

  createDeck(): Promise<Id>;

  saveDeck(deckId: Id): Promise<Id>;

  updateDeckProperties(deckId: Id, properties: Partial<Deck>): Promise<Deck>;

  deleteAllDecks(): Promise<void>;
  deleteDeck(id: Id, callback?: () => void): Promise<void>;

  backup(): void;
  restore(file: File): Promise<void>;

  dismissBanner(bannerId: string): Promise<void>;
};
