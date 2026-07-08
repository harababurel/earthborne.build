import { describe, expect, it } from "vitest";
import { z } from "zod";
import { decodeSearch, encodeSearch } from "./search-params.ts";

const SearchSchema = z.object({
  name: z.string().optional(),
  tag: z.union([z.string(), z.array(z.string())]).optional(),
});

describe("search params", () => {
  it("passes plain string values through", () => {
    expect(decodeSearch(SearchSchema, { name: "hello" })).toEqual({
      name: "hello",
    });
  });

  it("unwraps one-element arrays", () => {
    expect(decodeSearch(SearchSchema, { tag: ["solo"] })).toEqual({
      tag: "solo",
    });
  });

  it("keeps multi-element arrays", () => {
    expect(decodeSearch(SearchSchema, { tag: ["one", "two"] })).toEqual({
      tag: ["one", "two"],
    });
  });

  it("round-trips encoded search params", () => {
    const search = encodeSearch({ name: "Deck", tag: ["alpha", "beta"] });
    const params = Array.from(search.keys()).reduce(
      (acc, key) => {
        const values = search.getAll(key);
        acc[key] = values.length > 1 ? values : (values[0] ?? "");
        return acc;
      },
      {} as Record<string, string | string[]>,
    );

    expect(decodeSearch(SearchSchema, params)).toEqual({
      name: "Deck",
      tag: ["alpha", "beta"],
    });
  });
});
