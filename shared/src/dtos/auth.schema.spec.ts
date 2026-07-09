import { describe, expect, it } from "vitest";
import {
  CanonicalEmailSchema,
  CompleteProfileRequestSchema,
} from "./auth.schema.ts";

describe("auth schemas", () => {
  it("canonicalizes email values", () => {
    expect(CanonicalEmailSchema.parse("  Ranger@Example.COM  ")).toBe(
      "ranger@example.com",
    );
  });

  it("limits complete-profile deck uploads", () => {
    const result = CompleteProfileRequestSchema.safeParse({
      username: "ranger",
      uploads: {
        decks: Array.from({ length: 5001 }, (_, index) =>
          makeDeck(`deck-${index}`),
        ),
      },
    });

    expect(result.success).toBe(false);
  });

  it("limits complete-profile campaign uploads", () => {
    const result = CompleteProfileRequestSchema.safeParse({
      username: "ranger",
      uploads: {
        campaigns: Array.from({ length: 1001 }, (_, index) =>
          makeCampaign(`campaign-${index}`),
        ),
      },
    });

    expect(result.success).toBe(false);
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

function makeCampaign(id: string) {
  return {
    id,
    name: `Campaign ${id}`,
    date_creation: "2026-01-01T00:00:00.000Z",
    date_update: "2026-01-01T00:00:00.000Z",
    cycle_id: "core",
    expansions: [],
    extended_calendar: false,
    day: 1,
    start_location: null,
    current_location: null,
    current_path_terrain: null,
    history: [],
    missions: [],
    calendar: [],
    events: [],
    notes: [],
    rewards: [],
    removed: [],
    deck_ids: [],
    previous_campaign_id: null,
    next_campaign_id: null,
  };
}
