export type CardModalConfig = {
  listOrder?: string[];
};

export type CardModalState = {
  code: string | undefined;
  config: CardModalConfig | undefined;
};

export type ShareUpdateFailure = {
  deckId: string;
  message: string;
  occurredAt: number;
};

export type UIState = {
  ui: {
    cardModal: CardModalState;
    initialized: boolean;
    sessionInitialized: boolean;
    shareUpdateFailure: ShareUpdateFailure | undefined;
    navigationHistory: string[];
    showLimitedAccess: boolean;
    showUnusableCards: boolean;
  };
};

export type UISlice = UIState & {
  setShowUnusableCards(value: boolean): void;
  setShowLimitedAccess(value: boolean): void;

  pushHistory(path: string): void;
  pruneHistory(index: number): void;

  openCardModal(code: string): void;
  closeCardModal(): void;
  setCardModalConfig(config: CardModalConfig): void;
  setShareUpdateFailure(failure: ShareUpdateFailure): void;
  clearShareUpdateFailure(occurredAt: number): void;
};
