import { sql } from "kysely";
import type { Database } from "../db.ts";
import { resolveLocale } from "./translation.ts";

export async function getAppDataVersions(db: Database, locale?: string) {
  await ensureAppMetadataTable(db);

  const cardResult = await db
    .selectFrom("card")
    .select((eb) => eb.fn.countAll<number>().as("card_count"))
    .executeTakeFirst();

  const metadataResult = await db
    .selectFrom("app_metadata")
    .select(["key", "value"])
    .where("key", "in", ["cards_updated_at", "translations_updated_at"])
    .execute();
  const metadata = new Map(metadataResult.map((row) => [row.key, row.value]));

  return {
    card_count: cardResult?.card_count ?? 0,
    cards_updated_at:
      metadata.get("cards_updated_at") ?? "1970-01-01T00:00:00.000Z",
    locale: resolveLocale(locale),
    translation_updated_at:
      metadata.get("translations_updated_at") ?? "1970-01-01T00:00:00.000Z",
  };
}

async function ensureAppMetadataTable(db: Database) {
  await sql`
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `.execute(db);
}
