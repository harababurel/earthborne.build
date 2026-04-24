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
import { sql, type Transaction } from "kysely";
import { getDatabase } from "../db/db.ts";
import type { DB } from "../db/schema.types.ts";
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
  ebr: { id: "ebr", name: "Earthborne Rangers" },
};

try {
  await ingest();
  await db.destroy();
  log("info", "Ingestion complete");
} catch (err) {
  log("error", "Ingestion failed", { error: (err as Error).message });
  process.exit(1);
}

async function runMigrations() {
  const migrationsDir = path.join(import.meta.dirname, "../db/migrations");
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  await db.transaction().execute(async (tx) => {
    await sql`CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY)`.execute(
      tx,
    );

    const applied = await sql<{
      version: string;
    }>`SELECT version FROM schema_migrations`.execute(tx);
    const appliedVersions = new Set(applied.rows.map((r) => r.version));

    for (const file of files) {
      const version = file.split("_")[0];
      if (version && !appliedVersions.has(version)) {
        log("info", `Applying migration ${file}`);
        const content = await fs.readFile(
          path.join(migrationsDir, file),
          "utf-8",
        );

        // Split by -- migrate:up and -- migrate:down if present, or just run everything
        const upPart = content.split("-- migrate:down")[0] ?? content;
        const statements = upPart
          .replace(/-- migrate:up/g, "")
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const statement of statements) {
          await sql.raw(statement).execute(tx);
        }

        await sql`INSERT INTO schema_migrations (version) VALUES (${version})`.execute(
          tx,
        );
      }
    }
  });
}

async function ingest() {
  const startedAt = Date.now();
  const cardsUpdatedAt = new Date().toISOString();

  // Ensure database schema is up to date before ingesting.
  await runMigrations();

  await db.transaction().execute(async (tx) => {
    await ensureAppMetadataTable(tx);

    // Clear existing data in dependency order
    await tx.deleteFrom("card").execute();
    await tx.deleteFrom("card_set").execute();
    await tx.deleteFrom("set_type").execute();
    await tx.deleteFrom("aspect").execute();
    await tx.deleteFrom("card_type").execute();
    await tx.deleteFrom("token").execute();
    await tx.deleteFrom("area").execute();
    await tx.deleteFrom("category").execute();
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

    const categories =
      await readJson<{ id: string; name: string }[]>("categories.json");
    await tx.insertInto("category").values(categories).execute();
    log("info", `Inserted ${categories.length} categories`);

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
    const allCardsMap = new Map<string, ReturnType<typeof normalizeCard>>();

    for (const packId of packDirs) {
      const packDirPath = path.join(dataDir, "packs", packId);
      const stats = await fs.stat(packDirPath);
      if (!stats.isDirectory()) continue;

      const files = (await fs.readdir(packDirPath)).sort();

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        const packFile = path.join(packDirPath, file);
        const rawCards = await readFile<RawCard[]>(packFile);

        for (const c of rawCards) {
          const normalized = normalizeCard(c, remapPackId({ id: packId }).id);
          allCardsMap.set(normalized.id, normalized);
        }
        log(
          "info",
          `Processed ${rawCards.length} cards from pack '${packId}' file '${file}'`,
        );
      }
    }

    const cardsToInsert = Array.from(allCardsMap.values());

    // Validation
    const validAspects = new Set(aspects.map((a) => a.id));
    const validTypes = new Set(cardTypes.map((t) => t.id));
    const validSets = new Set(cardSets.map((s) => s.id));
    const validTokens = new Set(tokens.map((t) => t.id));
    const validAreas = new Set(areas.map((a) => a.id));
    const validCategories = new Set(categories.map((c) => c.id));
    const validPacks = new Set(packs.map((p) => remapPackId(p).id));

    let validationFailed = false;
    for (const c of cardsToInsert) {
      if (!validPacks.has(c.pack_id)) {
        log("error", `Card ${c.id} has invalid pack_id: ${c.pack_id}`);
        validationFailed = true;
      }
      if (c.aspect_id && !validAspects.has(c.aspect_id)) {
        log("error", `Card ${c.id} has invalid aspect_id: ${c.aspect_id}`);
        validationFailed = true;
      }
      if (!validTypes.has(c.type_id)) {
        log("error", `Card ${c.id} has invalid type_id: ${c.type_id}`);
        validationFailed = true;
      }
      if (c.set_id && !validSets.has(c.set_id)) {
        log("error", `Card ${c.id} has invalid set_id: ${c.set_id}`);
        validationFailed = true;
      }
      if (c.token_id && !validTokens.has(c.token_id)) {
        log("error", `Card ${c.id} has invalid token_id: ${c.token_id}`);
        validationFailed = true;
      }
      if (c.area_id && !validAreas.has(c.area_id)) {
        log("error", `Card ${c.id} has invalid area_id: ${c.area_id}`);
        validationFailed = true;
      }
      if (c.category_id && !validCategories.has(c.category_id)) {
        log("error", `Card ${c.id} has invalid category_id: ${c.category_id}`);
        validationFailed = true;
      }
      if (c.back_card_id && !allCardsMap.has(c.back_card_id)) {
        log(
          "error",
          `Card ${c.id} has invalid back_card_id: ${c.back_card_id}`,
        );
        validationFailed = true;
      }
    }

    if (validationFailed) {
      throw new Error(
        "Validation failed for one or more cards. See logs for details.",
      );
    }

    if (cardsToInsert.length > 0) {
      // Insert in chunks to avoid SQLite parameter limits
      const CHUNK_SIZE = 50;
      for (let i = 0; i < cardsToInsert.length; i += CHUNK_SIZE) {
        const chunk = cardsToInsert.slice(i, i + CHUNK_SIZE);
        await tx.insertInto("card").values(chunk).execute();
      }
    }

    log("info", `Inserted ${cardsToInsert.length} cards total`);

    await tx
      .insertInto("app_metadata")
      .values({ key: "cards_updated_at", value: cardsUpdatedAt })
      .onConflict((oc) =>
        oc.column("key").doUpdateSet({ value: cardsUpdatedAt }),
      )
      .execute();
  });

  log("info", "Ingestion finished", {
    cards_updated_at: cardsUpdatedAt,
    duration_ms: Date.now() - startedAt,
  });
}

// Raw shape coming out of rangers-card-data JSON files
interface RawCard {
  id: string;
  position: number;
  quantity: number;
  deck_limit?: number;
  category_id?: string;
  set_id?: string;
  set_position?: number;
  type_id: string;
  aspect_id?: string;
  level?: number;
  cost?: number;
  equip?: number;
  presence?: number;
  harm?: string | number;
  progress?: string | number;
  progress_fixed?: boolean;
  approach_conflict?: number;
  approach_reason?: number;
  approach_exploration?: number;
  approach_connection?: number;
  awareness?: number;
  fitness?: number;
  focus?: number;
  spirit?: number;
  token_id?: string;
  token_count?: string | number;
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
  image_rect?: number[];
  sun_challenge?: string;
  mountain_challenge?: string;
  crest_challenge?: string;
}

function normalizeCard(c: RawCard, packId: string) {
  return {
    id: c.id,
    code: c.id,
    pack_id: packId,
    category_id: c.category_id ?? null,
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
    aspect_awareness: c.awareness ?? null,
    aspect_fitness: c.fitness ?? null,
    aspect_focus: c.focus ?? null,
    aspect_spirit: c.spirit ?? null,
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
    image_rect: c.image_rect != null ? JSON.stringify(c.image_rect) : null,
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

async function ensureAppMetadataTable(db: Transaction<DB>) {
  await sql`
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `.execute(db);
}
