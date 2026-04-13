import type { Card } from "@arkham-build/shared";
import {
  BACKGROUND_PICKS,
  DECK_CARD_COPIES,
  DECK_SIZE,
  OUTSIDE_INTEREST_PICKS,
  PERSONALITY_PICKS,
  SPECIALTY_PICKS,
} from "@arkham-build/shared";
import { cardLimit } from "@/utils/card-utils";
import { time, timeEnd } from "@/utils/time";
import type { Metadata } from "../slices/metadata.types";
import type { Interpreter } from "./buildql/interpreter";
import type { LookupTables } from "./lookup-tables.types";
import type { ResolvedDeck } from "./types";

export type DeckValidationResult = {
  valid: boolean;
  errors: DeckValidationError[];
};

export type ValidationError =
  | "DECK_REQUIREMENTS_NOT_MET"
  | "FORBIDDEN"
  | "CARD_NOT_IN_LIMITED_POOL"
  | "INVALID_CARD_COUNT"
  | "INVALID_DECK_OPTION"
  | "INVALID_INVESTIGATOR"
  | "TOO_FEW_CARDS"
  | "TOO_MANY_CARDS";

type BaseError = {
  type: ValidationError;
};

type TooManyCardsError = {
  type: "TOO_MANY_CARDS";
  details: {
    target: "slots" | "extraSlots";
    count: number;
    countRequired: number;
  };
};

type TooFewCardsError = {
  type: "TOO_FEW_CARDS";
  details: {
    target: "slots" | "extraSlots";
    count: number;
    countRequired: number;
  };
};

type DeckOptionsError = {
  type: "INVALID_DECK_OPTION";
  details: {
    count: string;
    error: string;
  };
};

type DeckLimitViolation = {
  code: string;
  limit: number;
  quantity: number;
};

type InvalidCardError = {
  type: "INVALID_CARD_COUNT";
  details: DeckLimitViolation[];
};

type DeckRequirementsNotMetError = {
  type: "DECK_REQUIREMENTS_NOT_MET";
  details: {
    code: string;
    quantity: number;
    required: number;
  }[];
};

export type ForbiddenCardError = {
  type: "FORBIDDEN";
  details: {
    code: string;
    real_name: string;
    target: "slots" | "extraSlots";
  }[];
};

export type CardNotInLimitedPoolError = {
  type: "CARD_NOT_IN_LIMITED_POOL";
  details: {
    code: string;
    real_name: string;
    xp: number;
  }[];
};

export function isTooManyCardsError(
  error: DeckValidationError,
): error is TooManyCardsError {
  return error.type === "TOO_MANY_CARDS";
}

export function isDeckOptionsError(
  error: DeckValidationError,
): error is DeckOptionsError {
  return error.type === "INVALID_DECK_OPTION";
}

export function isInvalidCardCountError(
  error: DeckValidationError,
): error is InvalidCardError {
  return error.type === "INVALID_CARD_COUNT";
}

export function isForbiddenCardError(
  error: DeckValidationError,
): error is ForbiddenCardError {
  return error.type === "FORBIDDEN";
}

export function isCardNotInLimitedPoolError(
  error: DeckValidationError,
): error is CardNotInLimitedPoolError {
  return error.type === "CARD_NOT_IN_LIMITED_POOL";
}

export function isTooFewCardsError(
  error: DeckValidationError,
): error is TooFewCardsError {
  return error.type === "TOO_FEW_CARDS";
}

export function isDeckRequirementsNotMetError(
  error: DeckValidationError,
): error is DeckRequirementsNotMetError {
  return error.type === "DECK_REQUIREMENTS_NOT_MET";
}

export function isInvalidInvestigatorError(
  error: DeckValidationError,
): error is BaseError & { type: "INVALID_INVESTIGATOR" } {
  return error.type === "INVALID_INVESTIGATOR";
}

export type DeckValidationError =
  | BaseError
  | InvalidCardError
  | ForbiddenCardError
  | CardNotInLimitedPoolError
  | DeckOptionsError
  | TooManyCardsError
  | TooFewCardsError
  | DeckRequirementsNotMetError;

// Kept for API compatibility with callers that have not yet been updated.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getAdditionalDeckOptions(_deck: ResolvedDeck) {
  return [];
}

export function validateDeck(
  deck: ResolvedDeck,
  _metadata: Metadata,
  _lookupTables: LookupTables,
  _buildQlInterpreter: Interpreter,
): DeckValidationResult {
  time("validate_deck");

  const errors: DeckValidationError[] = [
    ...validateDeckSize(deck),
    ...validateCardLimits(deck),
    ...validateCardAccess(deck),
    ...validateCategoryPicks(deck),
  ];

  timeEnd("validate_deck");
  return { valid: errors.length === 0, errors };
}

// Total copy count across slots must equal DECK_SIZE (30).
function validateDeckSize(deck: ResolvedDeck): DeckValidationError[] {
  const deckSize = deck.stats.deckSize;
  const target = DECK_SIZE;

  if (deckSize === target) return [];

  const details = {
    target: "slots" as const,
    count: deckSize,
    countRequired: target,
  };

  return deckSize > target
    ? [{ type: "TOO_MANY_CARDS", details }]
    : [{ type: "TOO_FEW_CARDS", details }];
}

// Each card's copy count may not exceed its deck_limit (usually DECK_CARD_COPIES).
function validateCardLimits(deck: ResolvedDeck): DeckValidationError[] {
  const violations: DeckLimitViolation[] = [];

  for (const [code, quantity] of Object.entries(deck.slots)) {
    if (!quantity) continue;

    const card = deck.cards.slots[code]?.card;
    if (!card) continue;

    const limit = cardLimit(card) || DECK_CARD_COPIES;

    if (quantity > limit) {
      violations.push({ code, limit, quantity });
    }
  }

  return violations.length
    ? [{ type: "INVALID_CARD_COUNT", details: violations }]
    : [];
}

// Cards that are not accessible to this ranger are forbidden.
// Access is determined by the card's category and the ranger's background/specialty.
function validateCardAccess(deck: ResolvedDeck): DeckValidationError[] {
  const { background, specialty } = deck;

  // If the deck has no background/specialty yet (new deck setup), skip access validation.
  if (!background || !specialty) return [];

  const forbidden: ForbiddenCardError["details"] = [];

  for (const [code, quantity] of Object.entries(deck.slots)) {
    if (!quantity) continue;

    const card = deck.cards.slots[code]?.card;
    if (!card) continue;

    if (!isCardAccessible(card, background, specialty, deck)) {
      forbidden.push({
        code,
        real_name: card.name,
        target: "slots",
      });
    }
  }

  return forbidden.length ? [{ type: "FORBIDDEN", details: forbidden }] : [];
}

// Returns true if the card is accessible to a ranger with the given background/specialty.
function isCardAccessible(
  card: Card,
  background: string,
  specialty: string,
  deck: ResolvedDeck,
): boolean {
  const { category } = card;

  // Non-ranger-deck cards (path cards, beings, features, etc.) are never in the 30-card deck.
  if (!category) return false;

  if (category === "personality") return true;

  if (category === "background") {
    // Chosen background cards are accessible; one outside interest slot allows a different background.
    if (card.background_type === background) return true;
    return isOutsideInterest(card, background, specialty, deck);
  }

  if (category === "specialty") {
    if (card.specialty_type === specialty) return true;
    return isOutsideInterest(card, background, specialty, deck);
  }

  // Rewards and maladies are campaign additions; they are always treated as accessible if present.
  if (category === "reward" || category === "malady") return true;

  return false;
}

// A ranger has one outside interest slot: one card from a background or specialty set
// other than their chosen ones.
function isOutsideInterest(
  card: Card,
  background: string,
  specialty: string,
  deck: ResolvedDeck,
): boolean {
  // Count how many outside-interest unique cards are already in the deck.
  let outsideCount = 0;
  let cardIsOutside = false;

  for (const [code, quantity] of Object.entries(deck.slots)) {
    if (!quantity) continue;
    const c = deck.cards.slots[code]?.card;
    if (!c) continue;

    if (isOutsideInterestCard(c, background, specialty)) {
      outsideCount++;
      if (c.code === card.code) cardIsOutside = true;
    }
  }

  // The card qualifies as outside interest if it is in the outside interest position
  // and the slot doesn't exceed the allowed outside interest count.
  return cardIsOutside && outsideCount <= OUTSIDE_INTEREST_PICKS;
}

function isOutsideInterestCard(
  card: Card,
  background: string,
  specialty: string,
): boolean {
  if (card.category === "background" && card.background_type !== background)
    return true;
  if (card.category === "specialty" && card.specialty_type !== specialty)
    return true;
  return false;
}

// Validates the count of unique cards per category matches the expected picks.
// Each unique card appears exactly DECK_CARD_COPIES (2) times in the deck.
function validateCategoryPicks(deck: ResolvedDeck): DeckValidationError[] {
  const { background, specialty } = deck;

  // Only validate pick counts when background/specialty are configured.
  if (!background || !specialty) return [];

  const errors: DeckValidationError[] = [];

  const uniqueByCategory = countUniqueByCategory(deck, background, specialty);

  const checks: Array<{
    category: string;
    actual: number;
    required: number;
    label: string;
  }> = [
    {
      category: "personality",
      actual: uniqueByCategory.personality,
      required: PERSONALITY_PICKS,
      label: "Personality picks",
    },
    {
      category: "background",
      actual: uniqueByCategory.background,
      required: BACKGROUND_PICKS,
      label: "Background picks",
    },
    {
      category: "specialty",
      actual: uniqueByCategory.specialty,
      required: SPECIALTY_PICKS,
      label: "Specialty picks",
    },
    {
      category: "outside",
      actual: uniqueByCategory.outside,
      required: OUTSIDE_INTEREST_PICKS,
      label: "Outside interest picks",
    },
  ];

  for (const { actual, required, label } of checks) {
    if (actual !== required) {
      errors.push({
        type: "INVALID_DECK_OPTION",
        details: {
          count: `(${actual} / ${required})`,
          error: `${label}: expected ${required}, got ${actual}.`,
        },
      });
    }
  }

  return errors;
}

type CategoryCounts = {
  personality: number;
  background: number;
  specialty: number;
  outside: number;
};

function countUniqueByCategory(
  deck: ResolvedDeck,
  background: string,
  specialty: string,
): CategoryCounts {
  const counts: CategoryCounts = {
    personality: 0,
    background: 0,
    specialty: 0,
    outside: 0,
  };

  for (const [code, quantity] of Object.entries(deck.slots)) {
    if (!quantity) continue;

    const card = deck.cards.slots[code]?.card;
    if (!card?.category) continue;

    const { category } = card;

    if (category === "personality") {
      counts.personality++;
    } else if (category === "background") {
      if (card.background_type === background) {
        counts.background++;
      } else {
        counts.outside++;
      }
    } else if (category === "specialty") {
      if (card.specialty_type === specialty) {
        counts.specialty++;
      } else {
        counts.outside++;
      }
    }
    // rewards and maladies are not counted against the pick limits
  }

  return counts;
}
