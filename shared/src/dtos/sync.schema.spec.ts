import { describe, expect, it } from "vitest";
import { ItemBatchRequestSchema, SyncableDeckSchema } from "./sync.schema.ts";

describe("sync schemas", () => {
  it("accepts syncable deck ids up to 64 characters", () => {
    expect(SyncableDeckSchema.safeParse(makeDeck("x".repeat(64))).success).toBe(
      true,
    );
  });

  it("rejects syncable deck ids longer than 64 characters", () => {
    expect(SyncableDeckSchema.safeParse(makeDeck("x".repeat(65))).success).toBe(
      false,
    );
  });

  it("limits item batch requests to 250 ids", () => {
    expect(
      ItemBatchRequestSchema.safeParse({
        ids: Array.from({ length: 251 }, (_, index) => `item-${index}`),
      }).success,
    ).toBe(false);
  });
});

function makeDeck(id: string) {
  return {
    id,
    date_creation: "2026-01-01T00:00:00.000Z",
    date_update: "2026-01-01T00:00:00.000Z",
    description_md: "",
    meta: "{}",
    name: `Deck ${id}`,
    problem: null,
    slots: {},
    rewards: null,
    displaced: null,
    maladies: null,
    source: undefined,
    tags: "",
    user_id: null,
    aspect_code: "awareness",
    role_code: "01001",
    background: "forager",
    specialty: "artist",
  };
}
