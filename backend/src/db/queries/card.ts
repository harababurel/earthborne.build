import assert from "node:assert";
import type { Database } from "../db.ts";

// Area IDs from rangers-card-data map to frontend enum values.
const AREA_MAP: Record<string, "within_reach" | "along_the_way"> = {
  reach: "within_reach",
  along: "along_the_way",
};

// card_set.id values that map to specific ranger deck categories.
const SINGLETON_CATEGORY: Record<string, "personality" | "reward" | "malady"> =
  {
    personality: "personality",
    reward: "reward",
    malady: "malady",
  };

const KEYWORDS = [
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

type CardRow = {
  code: string;
  name: string;
  pack_id: string;
  set_id: string | null;
  set_position: number | null;
  position: number;
  quantity: number;
  deck_limit: number | null;
  type_id: string;
  aspect_id: string | null;
  level: number | null;
  cost: number | null;
  equip: number | null;
  presence: number | null;
  harm: number | null;
  progress: number | null;
  approach_conflict: number | null;
  approach_reason: number | null;
  approach_exploration: number | null;
  approach_connection: number | null;
  token_count: number | null;
  area_id: string | null;
  guide_entry: string | null;
  illustrator: string | null;
  text: string | null;
  flavor: string | null;
  traits: string | null;
  sun_challenge: string | null;
  mountain_challenge: string | null;
  crest_challenge: string | null;
  // joined fields
  set_type_id: string | null;
  token_name: string | null;
};

export type CardApiShape = ReturnType<typeof transformCard>;

export async function getAllCards(db: Database): Promise<CardApiShape[]> {
  const rows = await db
    .selectFrom("card")
    .leftJoin("card_set", "card.set_id", "card_set.id")
    .leftJoin("token", "card.token_id", "token.id")
    .select([
      "card.code",
      "card.name",
      "card.pack_id",
      "card.set_id",
      "card.set_position",
      "card.position",
      "card.quantity",
      "card.deck_limit",
      "card.type_id",
      "card.aspect_id",
      "card.level",
      "card.cost",
      "card.equip",
      "card.presence",
      "card.harm",
      "card.progress",
      "card.approach_conflict",
      "card.approach_reason",
      "card.approach_exploration",
      "card.approach_connection",
      "card.token_count",
      "card.area_id",
      "card.guide_entry",
      "card.illustrator",
      "card.text",
      "card.flavor",
      "card.traits",
      "card.sun_challenge",
      "card.mountain_challenge",
      "card.crest_challenge",
      "card_set.type_id as set_type_id",
      "token.name as token_name",
    ])
    .orderBy("card.pack_id")
    .orderBy("card.position")
    .execute();

  return rows.map((r) => transformCard(r as unknown as CardRow));
}

export async function getCardByCode(
  db: Database,
  code: string,
): Promise<CardApiShape> {
  const row = await db
    .selectFrom("card")
    .leftJoin("card_set", "card.set_id", "card_set.id")
    .leftJoin("token", "card.token_id", "token.id")
    .select([
      "card.code",
      "card.name",
      "card.pack_id",
      "card.set_id",
      "card.set_position",
      "card.position",
      "card.quantity",
      "card.deck_limit",
      "card.type_id",
      "card.aspect_id",
      "card.level",
      "card.cost",
      "card.equip",
      "card.presence",
      "card.harm",
      "card.progress",
      "card.approach_conflict",
      "card.approach_reason",
      "card.approach_exploration",
      "card.approach_connection",
      "card.token_count",
      "card.area_id",
      "card.guide_entry",
      "card.illustrator",
      "card.text",
      "card.flavor",
      "card.traits",
      "card.sun_challenge",
      "card.mountain_challenge",
      "card.crest_challenge",
      "card_set.type_id as set_type_id",
      "token.name as token_name",
    ])
    .where("card.code", "=", code)
    .limit(1)
    .executeTakeFirst();

  assert(row, `Card with code ${code} not found.`);
  return transformCard(row as unknown as CardRow);
}

function transformCard(row: CardRow): {
  code: string;
  name: string;
  pack_code: string;
  set_code: string | null;
  set_position: number | null;
  type_code: string;
  category:
    | "personality"
    | "background"
    | "specialty"
    | "reward"
    | "malady"
    | null;
  text: string | null;
  flavor: string | null;
  traits: string | null;
  energy_cost: number | null;
  energy_aspect: string | null;
  aspect_requirement_type: string | null;
  aspect_requirement_value: number | null;
  equip_value: number | null;
  approach_conflict: number | null;
  approach_reason: number | null;
  approach_exploration: number | null;
  approach_connection: number | null;
  presence: number | null;
  harm_threshold: number | null;
  progress_threshold: number | null;
  token_name: string | null;
  token_count: number | null;
  area: "within_reach" | "along_the_way" | null;
  campaign_guide_entry: number | null;
  quantity: number;
  deck_limit: number | null;
  keywords: (typeof KEYWORDS)[number][];
  is_unique: boolean;
  is_expert: boolean;
  background_type: string | null;
  specialty_type: string | null;
  illustrator: string | null;
  challenge_sun: string | null;
  challenge_mountain: string | null;
  challenge_crest: string | null;
} {
  const { set_id, set_type_id, area_id } = row;
  const keywords = parseKeywords(row.text);
  const isExpert = hasTrait(row.traits, "Expert");

  // Derive ranger deck category from card set data.
  let category:
    | "personality"
    | "background"
    | "specialty"
    | "reward"
    | "malady"
    | null = null;
  let background_type: string | null = null;
  let specialty_type: string | null = null;

  if (set_id) {
    if (SINGLETON_CATEGORY[set_id]) {
      category = SINGLETON_CATEGORY[set_id];
    } else if (set_type_id === "background") {
      category = "background";
      background_type = set_id;
    } else if (set_type_id === "specialty") {
      category = "specialty";
      specialty_type = set_id;
    }
  }

  const area = area_id ? (AREA_MAP[area_id] ?? null) : null;

  return {
    code: row.code,
    name: row.name,
    pack_code: row.pack_id,
    set_code: row.set_id,
    set_position: row.set_position,
    type_code: row.type_id,
    category,
    text: row.text,
    flavor: row.flavor,
    traits: row.traits,
    energy_cost: row.cost,
    energy_aspect: null,
    aspect_requirement_type: row.aspect_id,
    aspect_requirement_value: row.level,
    equip_value: row.equip,
    approach_conflict: row.approach_conflict,
    approach_reason: row.approach_reason,
    approach_exploration: row.approach_exploration,
    approach_connection: row.approach_connection,
    presence: row.presence,
    harm_threshold: row.harm,
    progress_threshold: row.progress,
    token_name: row.token_name,
    token_count: row.token_count,
    area,
    campaign_guide_entry: row.guide_entry ? Number(row.guide_entry) : null,
    quantity: row.quantity,
    deck_limit: row.deck_limit,
    keywords,
    is_unique: keywords.includes("unique"),
    is_expert: isExpert,
    background_type,
    specialty_type,
    illustrator: row.illustrator,
    challenge_sun: row.sun_challenge,
    challenge_mountain: row.mountain_challenge,
    challenge_crest: row.crest_challenge,
  };
}

function parseKeywords(text: string | null): (typeof KEYWORDS)[number][] {
  if (!text) return [];

  // Keywords appear on the first line as "Word. Word." or "Word N" segments —
  // single capitalized words separated by ". ", with an optional trailing
  // period and optional numeric value (e.g. "Fatiguing 2"). Validate this
  // structure before scanning so rules text that merely mentions a keyword
  // word does not produce false positives.
  const firstLine = text.split("\n")[0] ?? "";
  const stripped = firstLine
    .replace(/<f>.*?<\/f>/gs, "")
    .replace(/<[^>]+>/g, "")
    .trim();

  if (!/^[A-Z][a-z]+( \d+)?(\. [A-Z][a-z]+( \d+)?)*\.?$/.test(stripped)) {
    return [];
  }

  const normalized = stripped.toLowerCase();
  return KEYWORDS.filter((keyword) => normalized.includes(keyword));
}

function hasTrait(traits: string | null, trait: string): boolean {
  if (!traits) return false;
  return traits
    .split(/[./]/)
    .some((value) => value.trim().replace(/^¬/, "") === trait);
}
