import type { Deck } from "@earthborne-build/shared";
import { randomId } from "@/utils/crypto";
import i18n from "@/utils/i18n";

type Payload = {
  name: string;
  slots: Record<string, number>;
  aspect_code: string;
  role_code: string;
  background: string;
  specialty: string;
} & Partial<Omit<Deck, "id" | "date_creation" | "date_update">>;

export function createDeck(values: Payload): Deck {
  const timestamp = new Date().toISOString();

  return {
    id: randomId(),
    date_creation: timestamp,
    date_update: timestamp,
    description_md: "",
    meta: "",
    rewards: null,
    displaced: null,
    maladies: null,
    tags: "",
    ...values,
  };
}

export function getDefaultDeckName(name: string, faction: string) {
  return i18n.t(`deck_create.default_name.${faction}`, { name });
}

export function cloneDeck(deck: Deck): Deck {
  const now = new Date().toISOString();

  return {
    ...structuredClone(deck),
    id: randomId(),
    name: `(Copy) ${deck.name}`,
    date_creation: now,
    date_update: now,
    source: undefined,
  };
}
