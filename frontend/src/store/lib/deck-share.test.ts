import type { Card } from "@earthborne-build/shared";
import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import {
  buildDeckShareModel,
  formatDeckShareMarkdown,
  formatDeckShareText,
} from "./deck-share";
import type { ResolvedDeck } from "./types";

const t = ((key: string) => {
  const map: Record<string, string> = {
    "common.set.shepherd": "Shepherd",
    "common.set.conciliator": "Conciliator",
    "deck_edit.sections.personality": "Personality",
    "deck_edit.sections.background": "Background",
    "deck_edit.sections.specialty": "Specialty",
    "deck_edit.sections.outside_interest": "Outside Interest",
    "deck_share.included_rewards": "Included Rewards",
    "deck_edit.sections.rewards": "Unlocked Rewards",
    "deck_edit.sections.displaced": "Displaced Cards",
  };
  return map[key] ?? key;
}) as unknown as TFunction;

let position = 0;
function card(code: string, name: string, extra: Partial<Card>): Card {
  position += 1;
  return { code, name, set_position: position, ...extra } as Card;
}

const cards: Record<string, Card> = {
  p1: card("p1", "Insightful", { category: "personality" }),
  p2: card("p2", "Bold", { category: "personality" }),
  b1: card("b1", "Riri the Sparrow Hawk", {
    category: "background",
    background_type: "shepherd",
  }),
  b2: card("b2", "Homeward Bound", {
    category: "background",
    background_type: "shepherd",
  }),
  s1: card("s1", "Follow in Footsteps", {
    category: "specialty",
    specialty_type: "conciliator",
  }),
  // A card from a different background counts as outside interest.
  oi: card("oi", "Trail Mix", {
    category: "background",
    background_type: "forager",
  }),
  role: card("role", "Voice of the Elders", { type_code: "role" }),
  aspect: card("aspect", "Aspect", {
    type_code: "aspect",
    aspect_awareness: 2,
    aspect_spirit: 2,
    aspect_fitness: 3,
    aspect_focus: 1,
  }),
  rw: card("rw", "Some Reward", { category: "reward" }),
  dp: card("dp", "Displaced Card", {
    category: "background",
    background_type: "shepherd",
  }),
};

const deck = {
  name: "Tracked abuse for Solo",
  role_code: "role",
  aspect_code: "aspect",
  background: "shepherd",
  specialty: "conciliator",
  slots: { p1: 2, p2: 2, b1: 2, b2: 2, s1: 2, oi: 2 },
  rewards: { rw: 1 },
  displaced: { dp: 2 },
  cards: {
    slots: {
      p1: { card: cards.p1 },
      p2: { card: cards.p2 },
      b1: { card: cards.b1 },
      b2: { card: cards.b2 },
      s1: { card: cards.s1 },
      oi: { card: cards.oi },
    },
  },
} as unknown as ResolvedDeck;

const metadata = { cards } as unknown as Parameters<
  typeof buildDeckShareModel
>[1];

describe("deck-share", () => {
  it("formats the deck as plaintext", () => {
    const model = buildDeckShareModel(deck, metadata, t, {
      includeRewards: false,
      includeDisplaced: false,
    });

    expect(formatDeckShareText(model)).toBe(
      [
        "Tracked abuse for Solo",
        "Shepherd - Conciliator - Voice of the Elders",
        "2 AWA, 2 SPI, 3 FIT, 1 FOC",
        "",
        "Personality",
        "2x Insightful",
        "2x Bold",
        "",
        "Background: Shepherd",
        "2x Riri the Sparrow Hawk",
        "2x Homeward Bound",
        "",
        "Specialty: Conciliator",
        "2x Follow in Footsteps",
        "",
        "Outside Interest",
        "2x Trail Mix",
      ].join("\n"),
    );
  });

  it("formats the deck as markdown", () => {
    const model = buildDeckShareModel(deck, metadata, t, {
      includeRewards: false,
      includeDisplaced: false,
    });

    expect(formatDeckShareMarkdown(model)).toBe(
      [
        "# Tracked abuse for Solo",
        "",
        "**Shepherd** - **Conciliator** - **Voice of the Elders**",
        "",
        "**2 AWA, 2 SPI, 3 FIT, 1 FOC**",
        "",
        "## Personality",
        "",
        "* 2x Insightful",
        "* 2x Bold",
        "",
        "## Background: Shepherd",
        "",
        "* 2x Riri the Sparrow Hawk",
        "* 2x Homeward Bound",
        "",
        "## Specialty: Conciliator",
        "",
        "* 2x Follow in Footsteps",
        "",
        "## Outside Interest",
        "",
        "* 2x Trail Mix",
      ].join("\n"),
    );
  });

  it("adds an unlocked rewards section and displaced section on request", () => {
    // `rw` is unlocked (in the reward pool) but not swapped into the deck.
    const model = buildDeckShareModel(deck, metadata, t, {
      includeRewards: true,
      includeDisplaced: true,
    });

    const text = formatDeckShareText(model);
    // No in-deck rewards section, since nothing is swapped in.
    expect(text).not.toContain("Included Rewards");
    expect(text).toContain("\n\nUnlocked Rewards\n1x Some Reward");
    expect(text).toContain("\n\nDisplaced Cards\n2x Displaced Card");
  });

  it("always lists rewards that are swapped into the deck", () => {
    const deckWithReward = {
      ...deck,
      slots: { ...deck.slots, rw: 2 },
      cards: {
        slots: { ...deck.cards.slots, rw: { card: cards.rw } },
      },
    } as unknown as ResolvedDeck;

    const model = buildDeckShareModel(deckWithReward, metadata, t, {
      includeRewards: false,
      includeDisplaced: false,
    });

    expect(formatDeckShareText(model)).toContain(
      "\n\nIncluded Rewards\n2x Some Reward",
    );
  });

  it("lists a swapped-in reward in both sections when the option is on", () => {
    const deckWithReward = {
      ...deck,
      slots: { ...deck.slots, rw: 2 },
      cards: {
        slots: { ...deck.cards.slots, rw: { card: cards.rw } },
      },
    } as unknown as ResolvedDeck;

    const model = buildDeckShareModel(deckWithReward, metadata, t, {
      includeRewards: true,
      includeDisplaced: false,
    });

    const text = formatDeckShareText(model);
    expect(text).toContain("\n\nIncluded Rewards\n2x Some Reward");
    expect(text).toContain("\n\nUnlocked Rewards\n2x Some Reward");
  });
});
