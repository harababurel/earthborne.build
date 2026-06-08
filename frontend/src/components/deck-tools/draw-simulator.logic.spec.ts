import type { Card } from "@earthborne-build/shared";
import { describe, expect, it } from "vitest";
import type { ResolvedDeck } from "@/store/lib/types";
import {
  buildSimulatorDeck,
  createInitialSimulatorState,
  drawCards,
  drawOpeningHand,
  getSetupCandidates,
  redrawSelection,
  reshuffleSelection,
} from "./draw-simulator.logic";

const noShuffle = () => 0.999;
const reverseShuffle = () => 0;

describe("draw simulator logic", () => {
  it("draws exactly 6 from a normal deck", () => {
    const deck = createInitialSimulatorState(buildSimulatorDeck(mockDeck(10)));
    const state = drawOpeningHand(deck, noShuffle);

    expect(state.hand).toHaveLength(6);
    expect(state.remainingDeck).toHaveLength(4);
  });

  it("draws fewer than 6 from a short deck without throwing", () => {
    const deck = createInitialSimulatorState(buildSimulatorDeck(mockDeck(4)));

    expect(() => drawOpeningHand(deck, noShuffle)).not.toThrow();
    expect(drawOpeningHand(deck, noShuffle).hand).toHaveLength(4);
  });

  it("handles an empty deck without throwing", () => {
    const deck = createInitialSimulatorState(buildSimulatorDeck(mockDeck(0)));

    expect(() => drawOpeningHand(deck, noShuffle)).not.toThrow();
    expect(drawOpeningHand(deck, noShuffle).hand).toEqual([]);
  });

  it("shuffles the draw bag before drawing from a fresh state", () => {
    const state = drawCards(
      createInitialSimulatorState(
        buildSimulatorDeck(mockDeck(4)),
        null,
        reverseShuffle,
      ),
      1,
    );

    expect(state.hand[0]?.card.code).toBe("c1");
  });

  it("selected Setup card removes only one copy from the draw bag", () => {
    const deck = mockDeck(6, { setupCopies: 2 });

    expect(getSetupCandidates(deck).map(({ code }) => code)).toEqual(["s1"]);

    const state = createInitialSimulatorState(
      buildSimulatorDeck(deck),
      "s1",
      noShuffle,
    );

    expect(state.inPlay?.card.code).toBe("s1");
    expect(
      state.remainingDeck.filter(({ card }) => card.code === "s1"),
    ).toHaveLength(1);
    expect(state.remainingDeck).toHaveLength(7);
  });

  it("invalid stale Setup selection is ignored safely", () => {
    const state = createInitialSimulatorState(
      buildSimulatorDeck(mockDeck(4)),
      "missing",
    );

    expect(state.inPlay).toBeNull();
    expect(state.remainingDeck).toHaveLength(4);
  });

  it("draws the requested number of cards", () => {
    const state = drawCards(
      createInitialSimulatorState(buildSimulatorDeck(mockDeck(10))),
      2,
    );

    expect(state.hand).toHaveLength(2);
    expect(state.remainingDeck).toHaveLength(8);
  });

  it("redraws at most the number of selected cards", () => {
    const state = drawOpeningHand(
      createInitialSimulatorState(buildSimulatorDeck(mockDeck(10))),
      noShuffle,
    );
    const selectedIds = state.hand.slice(0, 3).map(({ id }) => id);
    const next = redrawSelection(state, selectedIds, noShuffle);

    expect(next.hand).toHaveLength(6);
    expect(
      selectedIds.every((id) => !next.hand.some((card) => card.id === id)),
    ).toBe(true);
  });

  it("redraw fills selected positions without shifting kept cards", () => {
    const state = drawOpeningHand(
      createInitialSimulatorState(
        buildSimulatorDeck(mockDeck(10)),
        null,
        noShuffle,
      ),
      noShuffle,
    );
    const selectedIds = [state.hand[1]?.id, state.hand[4]?.id].filter(
      (id): id is string => !!id,
    );
    const next = redrawSelection(state, selectedIds, noShuffle);

    expect(next.hand.map(({ card }) => card.code)).toEqual([
      "c0",
      "c6",
      "c2",
      "c3",
      "c7",
      "c5",
    ]);
  });

  it("set-aside cards return to the remaining deck after redraw", () => {
    const state = drawOpeningHand(
      createInitialSimulatorState(buildSimulatorDeck(mockDeck(7))),
      noShuffle,
    );
    const selectedIds = state.hand.slice(0, 3).map(({ id }) => id);
    const next = redrawSelection(state, selectedIds, noShuffle);

    expect(
      selectedIds.every((id) =>
        next.remainingDeck.some((card) => card.id === id),
      ),
    ).toBe(true);
    expect(next.remainingDeck).toHaveLength(3);
  });

  it("redraw can be used repeatedly", () => {
    const state = drawOpeningHand(
      createInitialSimulatorState(buildSimulatorDeck(mockDeck(10))),
      noShuffle,
    );
    const once = redrawSelection(
      state,
      state.hand.slice(0, 2).map(({ id }) => id),
      noShuffle,
    );
    const twice = redrawSelection(
      once,
      once.hand.slice(0, 2).map(({ id }) => id),
      noShuffle,
    );

    expect(twice).not.toBe(once);
    expect(twice.hand).toHaveLength(6);
  });

  it("reshuffles selected cards back into the remaining deck", () => {
    const state = drawOpeningHand(
      createInitialSimulatorState(buildSimulatorDeck(mockDeck(10))),
      noShuffle,
    );
    const selectedIds = state.hand.slice(0, 2).map(({ id }) => id);
    const next = reshuffleSelection(state, selectedIds, noShuffle);

    expect(next.hand).toHaveLength(4);
    expect(next.remainingDeck).toHaveLength(6);
    expect(
      selectedIds.every((id) =>
        next.remainingDeck.some((card) => card.id === id),
      ),
    ).toBe(true);
  });
});

function mockDeck(
  count: number,
  options: { setupCopies?: number } = {},
): ResolvedDeck {
  const cards: ResolvedDeck["cards"]["slots"] = {};
  const slots: Record<string, number> = {};

  for (let i = 0; i < count; i += 1) {
    const code = `c${i}`;
    cards[code] = {
      card: mockCard({ code }),
    } as ResolvedDeck["cards"]["slots"][string];
    slots[code] = 1;
  }

  if (options.setupCopies) {
    cards.s1 = {
      card: mockCard({ code: "s1", keywords: ["Setup"] }),
    } as ResolvedDeck["cards"]["slots"][string];
    slots.s1 = options.setupCopies;
  }

  return {
    cards: { slots: cards },
    slots,
  } as ResolvedDeck;
}

function mockCard(overrides: Partial<Card>): Card {
  return {
    code: "c0",
    name: "Test Card",
    pack_code: "core",
    type_code: "gear",
    keywords: [],
    ...overrides,
  } as Card;
}
