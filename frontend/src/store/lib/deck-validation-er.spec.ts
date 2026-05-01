import type {
  BackgroundType,
  Card,
  SpecialtyType,
} from "@earthborne-build/shared";
import { describe, expect, it } from "vitest";
import type { Metadata } from "../slices/metadata.types";
import type { Interpreter } from "./buildql/interpreter";
import {
  isDeckOptionsError,
  validateDeck as validateResolvedDeck,
} from "./deck-validation";
import type { LookupTables } from "./lookup-tables.types";
import type { ResolvedDeck } from "./types";

const metadata = {} as Metadata;
const lookupTables = {} as LookupTables;
const interpreter = {} as Interpreter;

function validateDeck(deck: ResolvedDeck) {
  return validateResolvedDeck(deck, metadata, lookupTables, interpreter);
}

const mockCard = (overrides: Partial<Card>): Card =>
  ({
    code: "000",
    name: "Mock Card",
    pack_code: "core",
    type_code: "gear",
    quantity: 2,
    is_unique: false,
    is_expert: false,
    keywords: [],
    ...overrides,
  }) as unknown as Card;

const personalityCard = (code: string) =>
  mockCard({ code, category: "personality", type_code: "moment" });
const backgroundCard = (code: string, type: BackgroundType) =>
  mockCard({ code, category: "background", background_type: type });
const specialtyCard = (code: string, type: SpecialtyType) =>
  mockCard({ code, category: "specialty", specialty_type: type });

describe("Earthborne Rangers Deck Validation", () => {
  it("validates a deck where outside interest is from the same specialty (e.g. Adherent of the First Ideal)", () => {
    const cards: Record<string, { card: Card }> = {};
    const slots: Record<string, number> = {};

    // 4 Personality
    const personalityCodes = ["01100", "01106", "01102", "01094"];
    for (const code of personalityCodes) {
      cards[code] = { card: personalityCard(code) };
      slots[code] = 2;
    }

    // 5 Background (Forager)
    const backgroundCodes = ["01031", "01028", "01029", "01034", "01035"];
    for (const code of backgroundCodes) {
      cards[code] = { card: backgroundCard(code, "forager") };
      slots[code] = 2;
    }

    // 6 Specialty (Shaper) - 5 regular + 1 outside interest
    const specialtyCodes = [
      "01081",
      "01085",
      "01082",
      "01083",
      "01084",
      "01090",
    ];
    for (const code of specialtyCodes) {
      cards[code] = { card: specialtyCard(code, "shaper") };
      slots[code] = 2;
    }

    const deck: ResolvedDeck = {
      id: "adherent-of-the-first-ideal",
      name: "Adherent of the First Ideal",
      background: "forager",
      specialty: "shaper",
      slots,
      cards: { slots: cards },
      stats: { deckSize: 30 },
    } as unknown as ResolvedDeck;

    const result = validateDeck(deck);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("fails a deck with 2 outside interest cards from different specialty", () => {
    const cards: Record<string, { card: Card }> = {};
    const slots: Record<string, number> = {};

    // 4 Personality
    for (let i = 1; i <= 4; i++) {
      const code = `p${i}`;
      cards[code] = { card: personalityCard(code) };
      slots[code] = 2;
    }

    // 5 Background (Artisan)
    for (let i = 1; i <= 5; i++) {
      const code = `b${i}`;
      cards[code] = { card: backgroundCard(code, "artisan") };
      slots[code] = 2;
    }

    // 5 Specialty (Shaper)
    for (let i = 1; i <= 5; i++) {
      const code = `s${i}`;
      cards[code] = { card: specialtyCard(code, "shaper") };
      slots[code] = 2;
    }

    // 1 Mismatch (Outside Interest) - VALID
    cards["m1"] = { card: specialtyCard("m1", "explorer") };
    slots["m1"] = 2;

    const deckValid: ResolvedDeck = {
      id: "test",
      name: "Test Deck",
      background: "artisan",
      specialty: "shaper",
      slots,
      cards: { slots: cards },
      stats: { deckSize: 30 },
    } as unknown as ResolvedDeck;

    const resultValid = validateDeck(deckValid);
    expect(resultValid.valid).toBe(true);

    // 2nd Mismatch (Outside Interest) - INVALID
    cards["m2"] = { card: specialtyCard("m2", "explorer") };
    slots["m2"] = 2;

    // Adjust deck size to 32 to avoid TOO_MANY_CARDS error masking the issue,
    // although validateCategoryPicks should still report it.
    const deckInvalid: ResolvedDeck = {
      id: "test",
      name: "Test Deck",
      background: "artisan",
      specialty: "shaper",
      slots,
      cards: { slots: cards },
      stats: { deckSize: 32 },
    } as unknown as ResolvedDeck;

    const resultInvalid = validateDeck(deckInvalid);
    expect(resultInvalid.valid).toBe(false);
    expect(
      resultInvalid.errors.some(
        (e) =>
          isDeckOptionsError(e) &&
          e.details.error.includes("Outside interest picks"),
      ),
    ).toBe(true);
  });

  it("does not enforce starter validation for an evolved deck", () => {
    const cards: Record<string, { card: Card }> = {};
    const slots: Record<string, number> = {};

    for (let i = 1; i <= 3; i++) {
      const code = `p${i}`;
      cards[code] = { card: personalityCard(code) };
      slots[code] = 2;
    }

    for (let i = 1; i <= 5; i++) {
      const code = `b${i}`;
      cards[code] = { card: backgroundCard(code, "artisan") };
      slots[code] = 2;
    }

    for (let i = 1; i <= 5; i++) {
      const code = `s${i}`;
      cards[code] = { card: specialtyCard(code, "shaper") };
      slots[code] = 2;
    }

    cards["m1"] = { card: specialtyCard("m1", "explorer") };
    slots["m1"] = 2;

    const deck: ResolvedDeck = {
      id: "evolved",
      name: "Evolved Deck",
      background: "artisan",
      specialty: "shaper",
      meta: JSON.stringify({ deckbuilding_state: "evolved" }),
      slots,
      rewards: null,
      displaced: null,
      maladies: null,
      cards: { slots: cards },
      stats: { deckSize: 28 },
    } as unknown as ResolvedDeck;

    const result = validateDeck(deck);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
