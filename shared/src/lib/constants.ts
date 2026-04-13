export const COMPARISON_OPERATOR = ["=", "!="] as const;

// Aspects — the four core stats of a Ranger, each producing energy tokens.
export type AspectKey = "awareness" | "fitness" | "focus" | "spirit";

export const ASPECT_ORDER = [
  "awareness",
  "fitness",
  "focus",
  "spirit",
] as const;

// Approaches — icons on cards committed as effort during tests.
export type ApproachKey = "conflict" | "reason" | "exploration" | "connection";

export const APPROACH_ORDER = [
  "conflict",
  "reason",
  "exploration",
  "connection",
] as const;

// Card types used across the entire game (ranger cards + path/game cards).
export const CARD_TYPE_ORDER = [
  "moment",
  "attachment",
  "gear",
  "being",
  "feature",
  "attribute",
  "path",
  "location",
  "weather",
  "mission",
  "challenge",
  "aspect",
  "role",
] as const;

export type CardType = (typeof CARD_TYPE_ORDER)[number];

// Categories for ranger deckbuilding cards.
export const RANGER_CARD_CATEGORY = [
  "personality",
  "background",
  "specialty",
  "reward",
  "malady",
] as const;

export type RangerCardCategory = (typeof RANGER_CARD_CATEGORY)[number];

// Background types (choose 1 during ranger creation).
export const BACKGROUND_TYPES = [
  "artisan",
  "forager",
  "shepherd",
  "talespinner",
  "traveler",
] as const;

export type BackgroundType = (typeof BACKGROUND_TYPES)[number];

// Specialty types (choose 1 during ranger creation).
export const SPECIALTY_TYPES = [
  "artificer",
  "conciliator",
  "explorer",
  "shaper",
  "spirit_speaker",
] as const;

export type SpecialtyType = (typeof SPECIALTY_TYPES)[number];

// Card set types for organizing the collection.
export const RANGER_SET_TYPES = [
  ...BACKGROUND_TYPES,
  ...SPECIALTY_TYPES,
  "personalities",
  "rewards",
  "maladies",
] as const;

export const PATH_SET_TYPES = [
  "branch",
  "fractured_wall",
  "general",
  "grassland",
  "lakeshore",
  "lone_tree_station",
  "marsh_of_rebirth",
  "meadow",
  "mountain_pass",
  "northern_outpost",
  "old_growth",
  "ravine",
  "river",
  "spire",
  "swamp",
  "tumbledown",
  "valley",
  "white_sky",
  "woods",
] as const;

export type PathSetType = (typeof PATH_SET_TYPES)[number];

// Terrain types shown on the valley map paths.
export const TERRAIN_TYPES = [
  "grassland",
  "lakeshore",
  "mountain_pass",
  "old_growth",
  "ravine",
  "river",
  "swamp",
  "woods",
] as const;

export type TerrainType = (typeof TERRAIN_TYPES)[number];

// Keywords that appear on cards.
export const KEYWORDS = [
  "ambush",
  "conduit",
  "disconnected",
  "fatiguing",
  "friendly",
  "manifestation",
  "obstacle",
  "persistent",
  "setup",
  "unique",
] as const;

export type Keyword = (typeof KEYWORDS)[number];

// Challenge icons on challenge cards.
export const CHALLENGE_ICONS = ["crest", "mountain", "sun"] as const;

export type ChallengeIcon = (typeof CHALLENGE_ICONS)[number];

// Deck construction constants.
export const DECK_SIZE = 30;
export const DECK_CARD_COPIES = 2;
export const MAX_EQUIP_VALUE = 5;
export const MAX_INJURIES = 3;
export const PERSONALITY_PICKS = 4;
export const BACKGROUND_PICKS = 5;
export const SPECIALTY_PICKS = 5;
export const OUTSIDE_INTEREST_PICKS = 1;
