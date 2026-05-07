import { describe, expect, it } from "vitest";
import { formatDataVersionTimestamp } from "./formatting";

describe("formatDataVersionTimestamp", () => {
  it("formats the timestamp in UTC with an explicit relative age", () => {
    expect(
      formatDataVersionTimestamp(
        "2026-05-07T10:49:33.000Z",
        new Date("2026-05-10T10:49:33.000Z"),
        "en-US",
      ),
    ).toBe("2026-05-07 10:49:33 UTC (3 days ago)");
  });

  it("treats timestamps without a timezone as UTC", () => {
    expect(
      formatDataVersionTimestamp(
        "2026-05-07T10:49:33",
        new Date("2026-05-14T10:49:33.000Z"),
        "en-US",
      ),
    ).toBe("2026-05-07 10:49:33 UTC (1 week ago)");
  });
});
