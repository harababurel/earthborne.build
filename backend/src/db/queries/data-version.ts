import { sql } from "kysely";
import type { Database } from "../db.ts";

export async function getAppDataVersions(db: Database) {
  await ensureAppMetadataTable(db);

  const cardResult = await db
    .selectFrom("card")
    .select((eb) => eb.fn.countAll<number>().as("card_count"))
    .executeTakeFirst();

  const metadataResult = await db
    .selectFrom("app_metadata")
    .select("value")
    .where("key", "=", "cards_updated_at")
    .executeTakeFirst();

  return {
    card_count: cardResult?.card_count ?? 0,
    cards_updated_at: metadataResult?.value ?? "1970-01-01T00:00:00.000Z",
    locale: "en",
    translation_updated_at: metadataResult?.value ?? "1970-01-01T00:00:00.000Z",
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
