import { describe, expect, it } from "vitest";
import { normalizeThreshold } from "../db/queries/card.ts";

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
