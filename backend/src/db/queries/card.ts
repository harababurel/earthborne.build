import { APPROACH_ORDER, type ApproachKey } from "@earthborne-build/shared";
import type { Database } from "../db.ts";
import { getTranslations, type TranslationMap } from "./translation.ts";

// Area IDs from rangers-card-data map to frontend enum values.
const AREA_MAP: Record<string, "within_reach" | "along_the_way"> = {
  within_reach: "within_reach",
  along_the_way: "along_the_way",
};

// card_set.id values that map to specific ranger deck categories.
const SINGLETON_CATEGORY: Record<string, "personality" | "reward" | "malady"> =
  {
    personality: "personality",
    reward: "reward",
    malady: "malady",
  };

type CardRow = {
  code: string;
  name: string;
  pack_id: string;
  set_id: string | null;
  set_position: number | string | null;
  set_size: number | null;
  position: number | null;
  quantity: number | null;
  deck_limit: number | null;
  type_id: string;
  aspect_requirement_type: string | null;
  aspect_requirement_value: number | null;
  energy_cost: number | string | null;
  equip: number | null;
  presence: number | null;
  harm: string | number | null;
  progress: string | number | null;
  approach_conflict: number | null;
  approach_reason: number | null;
  approach_exploration: number | null;
  approach_connection: number | null;
  approach_icons: string | null;
  aspect_awareness: number | null;
  aspect_fitness: number | null;
  aspect_focus: number | null;
  aspect_spirit: number | null;
  token_count: number | string | null;
  token_id: string | null;
  area_id: string | null;
  guide_entry: string | null;
  back_card_id: string | null;
  illustrator: string | null;
  text: string | null;
  flavor: string | null;
  traits: string | null;
  alt_imagesrc: string | null;
  alt_image_rect: string | null;
  alt_illustrator: string | null;
  back_imagesrc: string | null;
  back_image_rect: string | null;
  sun_challenge: string | null;
  mountain_challenge: string | null;
  crest_challenge: string | null;
  path_deck_assembly: string | null;
  arrival_setup: string | null;
  category_id: string | null;
  // joined fields
  set_type_id: string | null;
  subset_size: number | null;
  token_name: string | null;
  token_plural: string | null;
};

export type CardApiShape = ReturnType<typeof transformCard>;

export async function getAllCards(
  db: Database,
  locale?: string,
): Promise<CardApiShape[]> {
  const translations = await getTranslations(db, locale, ["card", "token"]);
  const rows = await db
    .selectFrom("card")
    .leftJoin("card_set", "card.set_id", "card_set.id")
    .leftJoin("card_subset", (join) =>
      join
        .onRef("card_subset.set_id", "=", "card.set_id")
        .onRef("card_subset.pack_id", "=", "card.pack_id"),
    )
    .leftJoin("token", "card.token_id", "token.id")
    .select([
      "card.code",
      "card.name",
      "card.pack_id",
      "card.set_id",
      "card.set_position",
      "card_set.size as set_size",
      "card_subset.size as subset_size",
      "card.position",
      "card.quantity",
      "card.deck_limit",
      "card.type_id",
      "card.aspect_requirement_type",
      "card.aspect_requirement_value",
      "card.energy_cost",
      "card.equip",
      "card.presence",
      "card.harm",
      "card.progress",
      "card.approach_conflict",
      "card.approach_reason",
      "card.approach_exploration",
      "card.approach_connection",
      "card.approach_icons",
      "card.aspect_awareness",
      "card.aspect_fitness",
      "card.aspect_focus",
      "card.aspect_spirit",
      "card.token_count",
      "card.token_id",
      "card.area_id",
      "card.guide_entry",
      "card.back_card_id",
      "card.illustrator",
      "card.text",
      "card.flavor",
      "card.traits",
      "card.alt_imagesrc",
      "card.alt_image_rect",
      "card.alt_illustrator",
      "card.back_imagesrc",
      "card.back_image_rect",
      "card.sun_challenge",
      "card.mountain_challenge",
      "card.crest_challenge",
      "card.path_deck_assembly",
      "card.arrival_setup",
      "card.category_id",
      "card_set.type_id as set_type_id",
      "card_subset.size as subset_size",
      "token.name as token_name",
      "token.plurals as token_plural",
    ])
    .orderBy("card.pack_id")
    .orderBy("card.code")
    .execute();

  return rows.map((r) => transformCard(r as unknown as CardRow, translations));
}

export async function getCardByCode(
  db: Database,
  code: string,
  locale?: string,
): Promise<CardApiShape> {
  const translations = await getTranslations(db, locale, ["card", "token"]);
  const row = await db
    .selectFrom("card")
    .leftJoin("card_set", "card.set_id", "card_set.id")
    .leftJoin("card_subset", (join) =>
      join
        .onRef("card_subset.set_id", "=", "card.set_id")
        .onRef("card_subset.pack_id", "=", "card.pack_id"),
    )
    .leftJoin("token", "card.token_id", "token.id")
    .select([
      "card.code",
      "card.name",
      "card.pack_id",
      "card.set_id",
      "card.set_position",
      "card_set.size as set_size",
      "card.position",
      "card.quantity",
      "card.deck_limit",
      "card.type_id",
      "card.aspect_requirement_type",
      "card.aspect_requirement_value",
      "card.energy_cost",
      "card.equip",
      "card.presence",
      "card.harm",
      "card.progress",
      "card.approach_conflict",
      "card.approach_reason",
      "card.approach_exploration",
      "card.approach_connection",
      "card.approach_icons",
      "card.aspect_awareness",
      "card.aspect_fitness",
      "card.aspect_focus",
      "card.aspect_spirit",
      "card.token_count",
      "card.token_id",
      "card.area_id",
      "card.guide_entry",
      "card.back_card_id",
      "card.illustrator",
      "card.text",
      "card.flavor",
      "card.traits",
      "card.alt_imagesrc",
      "card.alt_image_rect",
      "card.alt_illustrator",
      "card.back_imagesrc",
      "card.back_image_rect",
      "card.sun_challenge",
      "card.mountain_challenge",
      "card.crest_challenge",
      "card.path_deck_assembly",
      "card.arrival_setup",
      "card.category_id",
      "card_set.type_id as set_type_id",
      "card_subset.size as subset_size",
      "token.name as token_name",
      "token.plurals as token_plural",
    ])
    .where("card.code", "=", code)
    .limit(1)
    .executeTakeFirstOrThrow();

  return transformCard(row as unknown as CardRow, translations);
}

export function normalizeThreshold(value: string | number | null) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (/^\d+(\.0+)?$/.test(value)) return Number(value);
  return value;
}

function transformCard(
  row: CardRow,
  translations: TranslationMap,
): {
  code: string;
  name: string;
  real_name: string;
  pack_code: string;
  set_code: string | null;
  set_position: number | string | null;
  set_size: number | null;
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
  energy_cost: number | string | null;
  energy_aspect: string | null;
  aspect_requirement_type: string | null;
  aspect_requirement_value: number | null;
  equip_value: number | null;
  approach_conflict: number | null;
  approach_reason: number | null;
  approach_exploration: number | null;
  approach_connection: number | null;
  approach_icons: ApproachKey[] | null;
  presence: number | null;
  harm_threshold: string | number | null;
  progress_threshold: string | number | null;
  token_name: string | null;
  token_plural: string | null;
  token_count: string | number | null;
  area: "within_reach" | "along_the_way" | null;
  aspect_awareness: number | null;
  aspect_fitness: number | null;
  aspect_focus: number | null;
  aspect_spirit: number | null;
  campaign_guide_entry: string | null;
  quantity: number | null;
  deck_limit: number | null;
  keywords: string[];
  is_unique: boolean;
  is_expert: boolean;
  background_type: string | null;
  specialty_type: string | null;
  category_id: string | null;
  back_card_code: string | null;
  alt_image_url: string | null;
  alt_illustrator: string | null;
  back_image_url: string | null;
  illustrator: string | null;
  challenge_sun: string | null;
  challenge_mountain: string | null;
  challenge_crest: string | null;
  path_deck_assembly: string | null;
  arrival_setup: string | null;
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
  const translated = (field: string) =>
    translations.get(`card.${row.code}.${field}`);
  const tokenName = translations.get(`token.${row.token_id}.name`);
  const tokenPlurals = translations.get(`token.${row.token_id}.plurals`);

  return {
    code: row.code,
    name: translated("name") ?? row.name,
    real_name: row.name,
    pack_code: row.pack_id,
    set_code: row.set_id,
    set_position: normalizeThreshold(row.set_position),
    set_size: row.subset_size ?? row.set_size,
    type_code: row.type_id,
    category,
    text: translated("text") ?? row.text,
    flavor: translated("flavor") ?? row.flavor,
    traits: row.traits,
    energy_cost: row.energy_cost,
    energy_aspect: null,
    aspect_requirement_type: row.aspect_requirement_type,
    aspect_requirement_value: row.aspect_requirement_value,
    equip_value: row.equip,
    approach_conflict: row.approach_conflict,
    approach_reason: row.approach_reason,
    approach_exploration: row.approach_exploration,
    approach_connection: row.approach_connection,
    approach_icons: parseApproachIcons(row.approach_icons),
    presence: row.presence,
    harm_threshold: normalizeThreshold(row.harm),
    progress_threshold: normalizeThreshold(row.progress),
    token_name: tokenName ?? row.token_name,
    token_plural:
      tokenPlurals?.split(",")[1] ?? row.token_plural?.split(",")[1] ?? null,
    token_count: normalizeThreshold(row.token_count),
    area,
    aspect_awareness: row.aspect_awareness,
    aspect_fitness: row.aspect_fitness,
    aspect_focus: row.aspect_focus,
    aspect_spirit: row.aspect_spirit,
    campaign_guide_entry:
      row.guide_entry == null ? null : String(row.guide_entry),
    quantity: row.quantity,
    deck_limit: row.deck_limit,
    keywords,
    is_unique: keywords.includes("unique"),
    is_expert: isExpert,
    background_type,
    specialty_type,
    category_id: row.category_id,
    back_card_code: row.back_card_id,
    alt_image_url:
      row.alt_imagesrc || row.alt_image_rect ? `${row.code}a` : null,
    alt_illustrator: row.alt_illustrator,
    back_image_url:
      row.back_imagesrc || row.back_image_rect ? `${row.code}b` : null,
    illustrator: row.illustrator,
    challenge_sun: translated("sun_challenge") ?? row.sun_challenge,
    challenge_mountain:
      translated("mountain_challenge") ?? row.mountain_challenge,
    challenge_crest: translated("crest_challenge") ?? row.crest_challenge,
    path_deck_assembly: row.path_deck_assembly,
    arrival_setup: row.arrival_setup,
  };
}

function parseApproachIcons(value: string | null): ApproachKey[] | null {
  if (value == null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;

  const validApproaches = new Set<string>(APPROACH_ORDER);
  const icons = parsed.filter(
    (approach): approach is ApproachKey =>
      typeof approach === "string" && validApproaches.has(approach),
  );

  return icons.length === parsed.length ? icons : null;
}

export function parseKeywords(text: string | null): string[] {
  if (!text) return [];

  // Keywords appear in the opening property block. Card data separates that
  // block from rules text with HTML, usually <hr>, rather than only newlines.
  const firstBlock = text.split(/<hr\b[^>]*>|\n/i)[0] ?? "";
  const stripped = firstBlock
    .replace(/<f>.*?<\/f>/gs, "")
    .replace(/<[^>]+>/g, "")
    .trim();

  if (!/^[A-Z][a-z]+(?: \d+)?\.(?: [A-Z][a-z]+(?: \d+)?\.)*$/.test(stripped)) {
    return [];
  }

  return stripped
    .split(".")
    .map((segment) => segment.trim().split(" ")[0]?.toLowerCase())
    .filter((keyword): keyword is string => !!keyword);
}

function hasTrait(traits: string | null, trait: string): boolean {
  if (!traits) return false;
  return traits
    .split(/[./]/)
    .some((value) => value.trim().replace(/^¬/, "") === trait);
}
