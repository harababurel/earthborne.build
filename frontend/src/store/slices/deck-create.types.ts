import type { StorageProvider } from "@/utils/constants";

export type DeckCreateStep =
  | "name"
  | "aspect"
  | "personality"
  | "background"
  | "specialty"
  | "outside_interest"
  | "role"
  | "review";

type DeckCreateState = {
  step: DeckCreateStep;
  name: string;
  provider: Extract<StorageProvider, "local" | "shared">;
  roleCode?: string;
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

  initCreate: () => void;
  resetCreate: () => void;

  deckCreateSetStep(step: DeckCreateStep): void;
  deckCreateSetName(value: string): void;
  deckCreateSetProvider(provider: "local" | "shared"): void;
  deckCreateSetAspect(code: string): void;
  deckCreateSetBackground(type: string): void;
  deckCreateSetSpecialty(type: string): void;
  deckCreateSetRole(code: string): void;
  deckCreateSelectPersonalityCard(code: string): void;
  deckCreateToggleBackgroundCard(code: string): void;
  deckCreateToggleSpecialtyCard(code: string): void;
  deckCreateToggleOutsideInterest(code: string): void;
};
