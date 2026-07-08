import { describe, expect, it } from "vitest";
import { deckSearchQuery, parseDeckSearchQuery } from "./decklists-search.ts";

describe("decklist search requests", () => {
  it("parses valid decklist search params", () => {
    const search = deckSearchQuery({
      filters: { required: ["01100"], name: "Pathfinder" },
      offset: 30,
    });

    expect(parseDeckSearchQuery(search)).toEqual({
      filters: { required: ["01100"], name: "Pathfinder" },
      limit: 10,
      offset: 30,
    });
  });

  it("falls back to default filters for malformed card-code params", () => {
    expect(parseDeckSearchQuery(new URLSearchParams("required=a%20b"))).toEqual(
      {
        filters: {},
        limit: 10,
        offset: 0,
      },
    );
  });
});
