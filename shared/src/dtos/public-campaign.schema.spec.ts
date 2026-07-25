import { describe, expect, it } from "vitest";
import { type Campaign, CampaignSchema } from "../schemas/campaign.schema.ts";
import { type Deck, DeckSchema } from "../schemas/deck.schema.ts";
import {
  PublicCampaignSchema,
  toPublicCampaign,
  toPublicDeck,
} from "./public-campaign.schema.ts";

const PUBLIC_CAMPAIGN_KEYS = [
  "calendar",
  "current_location",
  "current_path_terrain",
  "cycle_id",
  "date_creation",
  "date_update",
  "day",
  "events",
  "expansions",
  "extended_calendar",
  "history",
  "id",
  "missions",
  "name",
  "notes",
  "removed",
  "rewards",
];

const PUBLIC_DECK_KEYS = [
  "aspect_code",
  "background",
  "date_creation",
  "date_update",
  "displaced",
  "id",
  "maladies",
  "name",
  "rewards",
  "role_code",
  "slots",
  "specialty",
];

describe("public campaign schema", () => {
  it("maps a campaign and its decks to the public payload", () => {
    const result = toPublicCampaign(makeCampaign(), [makeDeck()]);

    expect(result.schema_version).toBe(1);
    expect(result.campaign.id).toBe("campaign-1");
    expect(result.campaign.day).toBe(4);
    expect(result.campaign.current_location).toBe("lone-tree-station");
    expect(result.campaign.rewards).toEqual(["01050"]);
    expect(result.campaign.missions).toEqual([
      { day: 2, name: "Helping Hand", subject: "Quisi Vos", completed: true },
    ]);
    expect(result.decks).toHaveLength(1);
    expect(result.decks[0]?.name).toBe("Deck deck-1");
    expect(result.decks[0]?.slots).toEqual({ "01001": 2 });
    expect(PublicCampaignSchema.safeParse(result).success).toBe(true);
  });

  it("exposes exactly the documented campaign fields", () => {
    const { campaign } = toPublicCampaign(makeCampaign(), []);

    expect(Object.keys(campaign).sort()).toEqual(PUBLIC_CAMPAIGN_KEYS);
  });

  it("exposes exactly the documented deck fields", () => {
    expect(Object.keys(toPublicDeck(makeDeck())).sort()).toEqual(
      PUBLIC_DECK_KEYS,
    );
  });

  it("omits internal campaign bookkeeping", () => {
    const { campaign } = toPublicCampaign(makeCampaign(), []);

    expect(campaign).not.toHaveProperty("deck_ids");
    expect(campaign).not.toHaveProperty("start_location");
    expect(campaign).not.toHaveProperty("previous_campaign_id");
    expect(campaign).not.toHaveProperty("next_campaign_id");
  });

  it("omits internal deck bookkeeping", () => {
    const deck = toPublicDeck(makeDeck());

    expect(deck).not.toHaveProperty("user_id");
    expect(deck).not.toHaveProperty("meta");
    expect(deck).not.toHaveProperty("tags");
    expect(deck).not.toHaveProperty("source");
    expect(deck).not.toHaveProperty("description_md");
    expect(deck).not.toHaveProperty("problem");
  });

  // Guards the reason the nested entries are re-declared instead of reused: a
  // field added to an internal entry must not reach the public payload.
  it("strips unknown fields from nested entries", () => {
    const campaign = {
      ...makeCampaign(),
      notes: [{ note: "found a spring", day: 3, secret: "leak" }],
    } as unknown as Campaign;

    const result = toPublicCampaign(campaign, []);

    expect(result.campaign.notes[0]).not.toHaveProperty("secret");
    expect(result.campaign.notes[0]).toEqual({
      note: "found a spring",
      day: 3,
    });
  });

  it("normalizes unset deck slot maps to empty objects", () => {
    const deck = toPublicDeck(makeDeck());

    expect(deck.rewards).toEqual({});
    expect(deck.displaced).toEqual({});
    expect(deck.maladies).toEqual({});
  });

  it("preserves populated deck slot maps", () => {
    const deck = toPublicDeck(
      DeckSchema.parse({ ...makeDeck(), rewards: { "01050": 1 } }),
    );

    expect(deck.rewards).toEqual({ "01050": 1 });
  });

  it("stringifies numeric ids", () => {
    const campaign = CampaignSchema.parse({ ...makeCampaign(), id: 42 });
    const deck = DeckSchema.parse({ ...makeDeck(), id: 7 });

    const result = toPublicCampaign(campaign, [deck]);

    expect(result.campaign.id).toBe("42");
    expect(result.decks[0]?.id).toBe("7");
  });
});

function makeCampaign(): Campaign {
  return CampaignSchema.parse({
    id: "campaign-1",
    name: "Valley Run",
    date_creation: "2026-01-01T00:00:00.000Z",
    date_update: "2026-01-04T00:00:00.000Z",
    cycle_id: "core",
    expansions: ["sib"],
    extended_calendar: false,
    day: 4,
    start_location: "white-sky",
    current_location: "lone-tree-station",
    current_path_terrain: "woods",
    history: [{ day: 3, location: "white-sky", camped: true }],
    missions: [
      { day: 2, name: "Helping Hand", subject: "Quisi Vos", completed: true },
    ],
    calendar: [{ day: 4, guides: ["01100"] }],
    events: [{ event: "met a traveller" }],
    notes: [{ note: "found a spring", day: 3 }],
    rewards: ["01050"],
    removed: [{ name: "Old Path", action: "removed" }],
    deck_ids: ["deck-1"],
    previous_campaign_id: null,
    next_campaign_id: null,
  });
}

function makeDeck(): Deck {
  return DeckSchema.parse({
    id: "deck-1",
    date_creation: "2026-01-01T00:00:00.000Z",
    date_update: "2026-01-04T00:00:00.000Z",
    description_md: "private notes",
    meta: "{}",
    name: "Deck deck-1",
    problem: null,
    slots: { "01001": 2 },
    rewards: null,
    displaced: null,
    maladies: null,
    tags: "",
    user_id: 12,
    aspect_code: "awareness",
    role_code: "01001",
    background: "forager",
    specialty: "artist",
  });
}
