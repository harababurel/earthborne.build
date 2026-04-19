/**
 * Ingests card data from a rangers-card-data checkout into the SQLite database.
 *
 * Usage:
 *   CARD_DATA_DIR=/path/to/rangers-card-data npm run ingest:cards
 *
 * The CARD_DATA_DIR should point to a local clone of:
 *   https://github.com/zzorba/rangers-card-data
 */

import fs from "node:fs/promises";
import path from "node:path";
import { getDatabase } from "../db/db.ts";
import { configFromEnv } from "../lib/config.ts";
import { log } from "../lib/logger.ts";

const CARD_DATA_DIR = process.env["CARD_DATA_DIR"];
if (!CARD_DATA_DIR) {
  log("error", "CARD_DATA_DIR env var is required");
  process.exit(1);
}

const config = configFromEnv();
const db = getDatabase(config.SQLITE_PATH);

// The upstream card data uses "core" for the base set; we use "ebr" instead.
const PACK_ID_REMAP: Record<string, { id: string; name?: string }> = {
  core: { id: "ebr", name: "Earthborne Rangers" },
};

try {
  await ingest();
  await db.destroy();
  log("info", "Ingestion complete");
} catch (err) {
  log("error", "Ingestion failed", { error: (err as Error).message });
  process.exit(1);
}

async function ingest() {
  const startedAt = Date.now();

  await db.transaction().execute(async (tx) => {
    // Clear existing data in dependency order
    await tx.deleteFrom("card").execute();
    await tx.deleteFrom("card_set").execute();
    await tx.deleteFrom("set_type").execute();
    await tx.deleteFrom("aspect").execute();
    await tx.deleteFrom("card_type").execute();
    await tx.deleteFrom("token").execute();
    await tx.deleteFrom("area").execute();
    await tx.deleteFrom("pack").execute();

    // Lookup tables
    const aspects =
      await readJson<{ id: string; name: string; short_name: string }[]>(
        "aspects.json",
      );
    await tx.insertInto("aspect").values(aspects).execute();
    log("info", `Inserted ${aspects.length} aspects`);

    const cardTypes =
      await readJson<{ id: string; name: string }[]>("types.json");
    await tx.insertInto("card_type").values(cardTypes).execute();
    log("info", `Inserted ${cardTypes.length} card types`);

    const setTypes =
      await readJson<{ id: string; name: string }[]>("set_types.json");
    await tx.insertInto("set_type").values(setTypes).execute();
    log("info", `Inserted ${setTypes.length} set types`);

    const cardSets =
      await readJson<
        { id: string; name: string; type_id?: string; size?: number }[]
      >("sets.json");
    await tx
      .insertInto("card_set")
      .values(
        cardSets.map((s) => ({
          ...s,
          type_id: s.type_id ?? null,
          size: s.size ?? null,
        })),
      )
      .execute();
    log("info", `Inserted ${cardSets.length} card sets`);

    const tokensRaw =
      await readJson<{ id: string; name: string; plurals?: string }[]>(
        "tokens.json",
      );
    // Deduplicate by id (tokens.json has a duplicate 'buffer' entry)
    const seenTokens = new Set<string>();
    const tokens = tokensRaw.filter((t) => {
      if (seenTokens.has(t.id)) return false;
      seenTokens.add(t.id);
      return true;
    });
    await tx
      .insertInto("token")
      .values(tokens.map((t) => ({ ...t, plurals: t.plurals ?? null })))
      .execute();
    log("info", `Inserted ${tokens.length} tokens`);

    const areas = await readJson<{ id: string; name: string }[]>("areas.json");
    await tx.insertInto("area").values(areas).execute();
    log("info", `Inserted ${areas.length} areas`);

    const packs =
      await readJson<
        { id: string; name: string; short_name?: string; position: number }[]
      >("packs.json");
    await tx
      .insertInto("pack")
      .values(
        packs.map((p) => ({
          ...remapPackId(p),
          short_name: p.short_name ?? null,
        })),
      )
      .execute();
    log("info", `Inserted ${packs.length} packs`);

    // Cards — all JSON files per pack inside packs/{pack_id}/*.json
    const dataDir = CARD_DATA_DIR as string;
    const packDirs = await fs.readdir(path.join(dataDir, "packs"));
    let totalCards = 0;

    for (const packId of packDirs) {
      const packDirPath = path.join(dataDir, "packs", packId);
      const files = await fs.readdir(packDirPath);

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        const packFile = path.join(packDirPath, file);
        const rawCards = await readFile<RawCard[]>(packFile);

        const cards = rawCards.map((c) =>
          normalizeCard(c, remapPackId({ id: packId }).id),
        );
        if (cards.length === 0) continue;

        await tx.insertInto("card").values(cards).execute();
        totalCards += cards.length;
        log(
          "info",
          `Inserted ${cards.length} cards from pack '${packId}' file '${file}'`,
        );
      }
    }

    log("info", `Inserted ${totalCards} cards total`);
  });

  log("info", "Ingestion finished", { duration_ms: Date.now() - startedAt });
}

// Raw shape coming out of rangers-card-data JSON files
interface RawCard {
  id: string;
  position: number;
  quantity: number;
  deck_limit?: number;
  set_id?: string;
  set_position?: number;
  type_id: string;
  aspect_id?: string;
  level?: number;
  cost?: number;
  equip?: number;
  presence?: number;
  harm?: number;
  progress?: number;
  progress_fixed?: boolean;
  approach_conflict?: number;
  approach_reason?: number;
  approach_exploration?: number;
  approach_connection?: number;
  token_id?: string;
  token_count?: number;
  area_id?: string;
  guide_entry?: string;
  locations?: string[];
  back_card_id?: string;
  illustrator?: string;
  spoiler?: boolean;
  name: string;
  traits?: string;
  text?: string;
  flavor?: string;
  objective?: string;
  imagesrc?: string;
  sun_challenge?: string;
  mountain_challenge?: string;
  crest_challenge?: string;
}

function normalizeCard(c: RawCard, packId: string) {
  return {
    id: c.id,
    code: c.id,
    pack_id: packId,
    set_id: c.set_id ?? null,
    set_position: c.set_position ?? null,
    position: c.position,
    quantity: c.quantity,
    deck_limit: c.deck_limit ?? null,
    type_id: c.type_id,
    aspect_id: c.aspect_id ?? null,
    level: c.level ?? null,
    cost: c.cost ?? null,
    equip: c.equip ?? null,
    presence: c.presence ?? null,
    harm: c.harm ?? null,
    progress: c.progress ?? null,
    progress_fixed:
      c.progress_fixed != null ? (c.progress_fixed ? 1 : 0) : null,
    approach_conflict: c.approach_conflict ?? null,
    approach_reason: c.approach_reason ?? null,
    approach_exploration: c.approach_exploration ?? null,
    approach_connection: c.approach_connection ?? null,
    token_id: c.token_id ?? null,
    token_count: c.token_count ?? null,
    area_id: c.area_id ?? null,
    guide_entry: c.guide_entry ?? null,
    locations: c.locations != null ? JSON.stringify(c.locations) : null,
    back_card_id: c.back_card_id ?? null,
    illustrator: c.illustrator ?? null,
    spoiler: c.spoiler != null ? (c.spoiler ? 1 : 0) : null,
    name: c.name,
    traits: c.traits ?? null,
    text: c.text ?? null,
    flavor: c.flavor ?? null,
    objective: c.objective ?? null,
    imagesrc: c.imagesrc ?? null,
    sun_challenge: c.sun_challenge ?? null,
    mountain_challenge: c.mountain_challenge ?? null,
    crest_challenge: c.crest_challenge ?? null,
  };
}

function remapPackId<T extends { id: string; name?: string }>(pack: T): T {
  const remap = PACK_ID_REMAP[pack.id];
  if (!remap) return pack;
  return { ...pack, ...remap };
}

function readJson<T>(filename: string): Promise<T> {
  return readFile<T>(path.join(CARD_DATA_DIR as string, filename));
}

async function readFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}
