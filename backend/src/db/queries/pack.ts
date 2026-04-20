import type { Database } from "../db.ts";

export async function getAllPacks(db: Database) {
  return await db
    .selectFrom("pack")
    .select(["id", "id as code", "name", "short_name", "position"])
    .orderBy("position")
    .execute();
}
