import type { Card, RangersDbDeck } from "@earthborne-build/shared";
import { describe, expect, it } from "vitest";
import {
  parseRangersDbDeckId,
  parseRangersDbDeckText,
  rangersDbDeckToImport,
} from "./rangersdb-import";

function makeCard(partial: Partial<Card> & Pick<Card, "code" | "name">): Card {
  return {
    pack_code: "ebr",
    type_code: "moment",
    ...partial,
  } as Card;
}

const cards: Record<string, Card> = Object.fromEntries(
  [
    makeCard({
      code: "01241",
      name: "1322 aspect",
      type_code: "aspect",
      aspect_awareness: 1,
      aspect_spirit: 3,
      aspect_fitness: 2,
      aspect_focus: 2,
    }),
    makeCard({
      code: "03037",
      name: "Keeper of the Grove",
      type_code: "role",
      category: "specialty",
      specialty_type: "spirit_speaker",
    }),
    ...[
      ["01094", "Vigilant"],
      ["01099", "Determined"],
      ["01102", "Versatile"],
      ["01105", "Persuasive"],
    ].map(([code, name]) =>
      makeCard({ code, name, type_code: "attribute", category: "personality" }),
    ),
    ...[
      ["01001", "Eagle Eye"],
      ["01003", "Strider"],
      ["01004", "Trail Mix"],
      ["01005", "Reverb Locket"],
      ["01006", "Perfect Recall"],
    ].map(([code, name]) =>
      makeCard({
        code,
        name,
        category: "background",
        background_type: "traveler",
      }),
    ),
    makeCard({
      code: "01010",
      name: "The Right Tool",
      category: "background",
      background_type: "artisan",
    }),
    ...[
      ["03040", "Clearer of Ways"],
      ["03041", "Call Upon the Spirits"],
      ["03044", "The Path Opens Before Me"],
      ["03045", "Attendant Guide"],
      ["03046", "Atrox Spirit"],
    ].map(([code, name]) =>
      makeCard({
        code,
        name,
        category: "specialty",
        specialty_type: "spirit_speaker",
      }),
    ),
    makeCard({
      code: "90001",
      name: "Some Reward",
      category: "reward",
    }),
  ].map((card) => [card.code, card]),
);

const expectedSlots = {
  personalitySlots: {
    "01094": 2,
    "01099": 2,
    "01102": 2,
    "01105": 2,
  },
  backgroundSlots: {
    "01001": 2,
    "01003": 2,
    "01004": 2,
    "01005": 2,
    "01006": 2,
  },
  specialtySlots: {
    "03040": 2,
    "03041": 2,
    "03044": 2,
    "03045": 2,
    "03046": 2,
  },
  outsideInterestSlots: {
    "01010": 2,
  },
};

describe("parseRangersDbDeckId", () => {
  it("parses bare numeric ids", () => {
    expect(parseRangersDbDeckId("39996")).toBe(39996);
    expect(parseRangersDbDeckId("  39996 ")).toBe(39996);
  });

  it("parses deck view URLs", () => {
    expect(parseRangersDbDeckId("https://rangersdb.com/decks/view/39996")).toBe(
      39996,
    );
    expect(parseRangersDbDeckId("rangersdb.com/decks/view/39996")).toBe(39996);
    expect(
      parseRangersDbDeckId("https://www.rangersdb.com/decks/view/39996/"),
    ).toBe(39996);
    expect(
      parseRangersDbDeckId("https://rangersdb.com/zh/decks/view/39996"),
    ).toBe(39996);
  });

  it("rejects other input", () => {
    expect(parseRangersDbDeckId("")).toBeUndefined();
    expect(parseRangersDbDeckId("-5")).toBeUndefined();
    expect(parseRangersDbDeckId("https://example.com/decks/view/1")).toBe(
      undefined,
    );
    expect(parseRangersDbDeckId("https://rangersdb.com/decks")).toBeUndefined();
  });
});

describe("rangersDbDeckToImport", () => {
  const deck: RangersDbDeck = {
    id: 39996,
    name: "test1",
    awa: 1,
    spi: 3,
    fit: 2,
    foc: 2,
    meta: {
      role: "03037",
      specialty: "spirit_speaker",
      background: "traveler",
    },
    slots: Object.fromEntries(
      Object.values(expectedSlots).flatMap((slots) => Object.entries(slots)),
    ),
  };

  it("maps a RangersDB deck to deck create state", () => {
    const result = rangersDbDeckToImport(cards, deck);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.payload).toEqual({
      name: "test1",
      aspectCode: "01241",
      background: "traveler",
      specialty: "spirit_speaker",
      roleCode: "03037",
      ...expectedSlots,
    });
  });

  it("reports unknown codes and unsupported cards", () => {
    const result = rangersDbDeckToImport(cards, {
      ...deck,
      slots: { ...deck.slots, "99999": 2, "90001": 1 },
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([
      { type: "unsupported_card", value: "Some Reward" },
      { type: "unknown_code", value: "99999" },
    ]);
  });

  it("flags codes whose RangersDB name differs from ours", () => {
    const result = rangersDbDeckToImport(cards, {
      ...deck,
      cards: {
        "01001": "Eagle Eye",
        "01094": "Watchful",
        "03037": "Warden of the Grove",
      },
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([
      {
        type: "name_conflict",
        value: "03037",
        theirs: "Warden of the Grove",
        ours: "Keeper of the Grove",
      },
      {
        type: "name_conflict",
        value: "01094",
        theirs: "Watchful",
        ours: "Vigilant",
      },
    ]);
    // The cards are still imported; the conflict is a warning.
    expect(result.payload.personalitySlots["01094"]).toBe(2);
  });

  it("reports missing identity", () => {
    const result = rangersDbDeckToImport(cards, {
      ...deck,
      awa: null,
      meta: { role: "99999", background: "space_wizard" },
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        { type: "missing_background", value: "space_wizard" },
        { type: "missing_specialty", value: undefined },
        { type: "missing_role", value: "99999" },
        { type: "missing_aspects" },
      ]),
    );
  });
});

const plaintextExport = `test1
----------------------------------------------------------------------
Traveler - Spirit Speaker - Keeper of the Grove
1 AWA, 3 SPI, 2 FIT, 2 FOC
----------------------------------------------------------------------
Personality

2x Vigilant
2x Determined
2x Versatile
2x Persuasive
----------------------------------------------------------------------
Background: Traveler

2x Eagle Eye
2x Strider
2x Trail Mix
2x Reverb Locket
2x Perfect Recall
----------------------------------------------------------------------
Specialty: Spirit Speaker

2x Clearer of Ways
2x Call Upon the Spirits
2x The Path Opens Before Me
2x Attendant Guide
2x Atrox Spirit
----------------------------------------------------------------------
Outside Interest

2x The Right Tool
`;

const markdownExport = `test1
----------------------------------------------------------------------
**Traveler** - **Spirit Speaker** - **Keeper of the Grove**

**1 AWA, 3 SPI, 2 FIT, 2 FOC**

----------------------------------------------------------------------

_Personality_

* 2x Vigilant
* 2x Determined
* 2x Versatile
* 2x Persuasive
----------------------------------------------------------------------

_Background: Traveler_

* 2x Eagle Eye
* 2x Strider
* 2x Trail Mix
* 2x Reverb Locket
* 2x Perfect Recall
----------------------------------------------------------------------

_Specialty: Spirit Speaker_

* 2x Clearer of Ways
* 2x Call Upon the Spirits
* 2x The Path Opens Before Me
* 2x Attendant Guide
* 2x Atrox Spirit
----------------------------------------------------------------------

_Outside Interest_

* 2x The Right Tool
`;

describe("parseRangersDbDeckText", () => {
  it.each([
    ["plaintext", plaintextExport],
    ["markdown", markdownExport],
  ])("parses the %s export format", (_, text) => {
    const result = parseRangersDbDeckText(cards, text);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.payload).toEqual({
      name: "test1",
      aspectCode: "01241",
      background: "traveler",
      specialty: "spirit_speaker",
      roleCode: "03037",
      ...expectedSlots,
    });
  });

  it("matches card names case-insensitively", () => {
    const result = parseRangersDbDeckText(
      cards,
      "deck\nTraveler - Spirit Speaker - Keeper of the Grove\n1 AWA, 3 SPI, 2 FIT, 2 FOC\n2x eagle eye",
    );

    expect(result.issues).toEqual([]);
    expect(result.payload.backgroundSlots).toEqual({ "01001": 2 });
  });

  it("reports unmatched cards", () => {
    const result = parseRangersDbDeckText(
      cards,
      "deck\nTraveler - Spirit Speaker - Keeper of the Grove\n1 AWA, 3 SPI, 2 FIT, 2 FOC\n2x No Such Card",
    );

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([
      { type: "unmatched_card", value: "No Such Card" },
    ]);
  });

  it("reports missing identity on unparseable text", () => {
    const result = parseRangersDbDeckText(cards, "just a name");

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.type)).toEqual([
      "missing_background",
      "missing_specialty",
      "missing_role",
      "missing_aspects",
    ]);
  });
});
