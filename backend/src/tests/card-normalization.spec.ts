import { describe, expect, it } from "vitest";
import { normalizeThreshold, parseKeywords } from "../db/queries/card.ts";

describe("normalizeThreshold", () => {
  it("should return null for null", () => {
    expect(normalizeThreshold(null)).toBe(null);
  });

  it("should return a number as is", () => {
    expect(normalizeThreshold(3)).toBe(3);
    expect(normalizeThreshold(3.5)).toBe(3.5);
  });

  it("should convert integer strings with .0 to numbers", () => {
    expect(normalizeThreshold("3.0")).toBe(3);
    expect(normalizeThreshold("3.00")).toBe(3);
    expect(normalizeThreshold("14.0")).toBe(14);
  });

  it("should convert integer strings to numbers", () => {
    expect(normalizeThreshold("3")).toBe(3);
  });

  it("should preserve fractional strings", () => {
    expect(normalizeThreshold("56.1")).toBe("56.1");
    expect(normalizeThreshold("3.5")).toBe("3.5");
  });

  it("should preserve non-numeric strings", () => {
    expect(normalizeThreshold("3-5")).toBe("3-5");
    expect(normalizeThreshold("X")).toBe("X");
  });
});

describe("parseKeywords", () => {
  it("parses keywords before an HTML rules separator", () => {
    expect(
      parseKeywords(
        "Persistent. Unique. Spirit.<hr><b>Exhaust:</b> Discard up to 3[progress].",
      ),
    ).toEqual(["persistent", "unique"]);
  });

  it("parses known keywords when the property block contains untracked properties", () => {
    expect(
      parseKeywords(
        "Unique. Objective (6 hunches: [aspiration]).<hr>This gear does not ready during the refresh phase.",
      ),
    ).toEqual(["unique"]);
  });

  it("does not parse keyword mentions from rules text", () => {
    expect(
      parseKeywords(
        "<b>Response:</b> After a being with the unique keyword is cleared, draw 1 card.",
      ),
    ).toEqual([]);
  });
});
