import type { StorageProvider } from "@/utils/constants";

export type DeckCreateStep =
  | "name"
  | "aspect"
  | "background"
  | "specialty"
  | "personality"
  | "outside_interest"
  | "review";

type DeckCreateState = {
  step: DeckCreateStep;
  name: string;
  provider: Extract<StorageProvider, "local" | "shared">;
  roleCode: string;
  aspectCode?: string;
  background?: string;
  specialty?: string;
  backgroundSlots: Record<string, number>;
  specialtySlots: Record<string, number>;
  personalitySlots: Record<string, number>;
  outsideInterestSlots: Record<string, number>;
};

export type DeckCreateSlice = {
  deckCreate: DeckCreateState | undefined;

  initCreate: (code: string) => void;
  resetCreate: () => void;

  deckCreateSetStep(step: DeckCreateStep): void;
  deckCreateSetName(value: string): void;
  deckCreateSetProvider(provider: "local" | "shared"): void;
  deckCreateSetAspect(code: string): void;
  deckCreateSetBackground(type: string): void;
  deckCreateSetSpecialty(type: string): void;
  deckCreateToggleBackgroundCard(code: string): void;
  deckCreateToggleSpecialtyCard(code: string): void;
  deckCreateToggleOutsideInterest(code: string): void;
};
