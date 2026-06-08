import type { Card } from "@earthborne-build/shared";
import type { ResolvedDeck } from "@/store/lib/types";
import { isSpecialCard } from "@/utils/card-utils";

export const OPENING_HAND_SIZE = 6;

export type SimulatorCard = {
  card: Card;
  id: string;
};

export type SimulatorState = {
  hand: SimulatorCard[];
  inPlay: SimulatorCard | null;
  remainingDeck: SimulatorCard[];
};

export function buildSimulatorDeck(deck: ResolvedDeck): SimulatorCard[] {
  const cards: SimulatorCard[] = [];

  for (const [code, rawQuantity] of Object.entries(deck.slots ?? {})) {
    const quantity = Math.floor(rawQuantity);
    const card = deck.cards.slots[code]?.card;
    if (!card || quantity <= 0 || isSpecialCard(card)) continue;

    for (let i = 0; i < quantity; i += 1) {
      cards.push({ card, id: `${code}:${i}` });
    }
  }

  return cards;
}

export function getSetupCandidates(deck: ResolvedDeck): Card[] {
  return Object.entries(deck.slots ?? {})
    .filter(([, quantity]) => quantity > 0)
    .map(([code]) => deck.cards.slots[code]?.card)
    .filter((card): card is Card => !!card && !isSpecialCard(card))
    .filter(hasSetupKeyword);
}

export function prepareSimulatorDeck(
  deck: SimulatorCard[],
  setupCode: string | null | undefined,
) {
  if (!setupCode) return { inPlay: null, drawDeck: deck };

  const setupIndex = deck.findIndex(({ card }) => card.code === setupCode);
  if (setupIndex < 0) return { inPlay: null, drawDeck: deck };

  const inPlay = deck[setupIndex] ?? null;
  return {
    inPlay,
    drawDeck: deck.filter((_, index) => index !== setupIndex),
  };
}

export function createInitialSimulatorState(
  deck: SimulatorCard[],
  setupCode?: string | null,
  random: () => number = Math.random,
): SimulatorState {
  const { drawDeck, inPlay } = prepareSimulatorDeck(deck, setupCode);

  return {
    hand: [],
    inPlay,
    remainingDeck: shuffle(drawDeck, random),
  };
}

export function drawOpeningHand(
  state: SimulatorState,
  random: () => number = Math.random,
): SimulatorState {
  const shuffled = shuffle(state.remainingDeck, random);
  const count = Math.min(OPENING_HAND_SIZE, shuffled.length);

  return {
    ...state,
    hand: shuffled.slice(0, count),
    remainingDeck: shuffled.slice(count),
  };
}

export function drawCards(
  state: SimulatorState,
  count: number,
): SimulatorState {
  if (count <= 0 || state.remainingDeck.length === 0) return state;

  const drawCount = Math.min(count, state.remainingDeck.length);

  return {
    ...state,
    hand: [...state.hand, ...state.remainingDeck.slice(0, drawCount)],
    remainingDeck: state.remainingDeck.slice(drawCount),
  };
}

export function redrawSelection(
  state: SimulatorState,
  selectedIds: Iterable<string>,
  random: () => number = Math.random,
): SimulatorState {
  if (state.hand.length === 0) return state;

  const selected = new Set(selectedIds);
  if (selected.size === 0) return state;

  const setAside = state.hand.filter(({ id }) => selected.has(id));
  const replacementCount = Math.min(
    setAside.length,
    state.remainingDeck.length,
  );
  const replacements = state.remainingDeck.slice(0, replacementCount);
  const hand = [...state.hand];

  let replacementIndex = 0;
  for (let i = 0; i < hand.length; i += 1) {
    const card = hand[i];
    if (!card || !selected.has(card.id)) continue;

    const replacement = replacements[replacementIndex];
    if (replacement) {
      hand[i] = replacement;
      replacementIndex += 1;
    }
  }

  const remainingDeck = shuffle(
    [...state.remainingDeck.slice(replacementCount), ...setAside],
    random,
  );

  return {
    ...state,
    hand: hand.filter(({ id }) => !selected.has(id)),
    remainingDeck,
  };
}

export function reshuffleSelection(
  state: SimulatorState,
  selectedIds: Iterable<string>,
  random: () => number = Math.random,
): SimulatorState {
  if (state.hand.length === 0) return state;

  const selected = new Set(selectedIds);
  if (selected.size === 0) return state;

  const kept = state.hand.filter(({ id }) => !selected.has(id));
  const setAside = state.hand.filter(({ id }) => selected.has(id));

  return {
    ...state,
    hand: kept,
    remainingDeck: shuffle([...state.remainingDeck, ...setAside], random),
  };
}

export function shuffle<T>(
  items: readonly T[],
  random: () => number = Math.random,
) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const item = result[i];
    result[i] = result[j] as T;
    result[j] = item as T;
  }

  return result;
}

function hasSetupKeyword(card: Card) {
  return card.keywords?.some((keyword) => keyword.toLowerCase() === "setup");
}
