import type { Database } from "../db.ts";

export async function getAllPacks(db: Database) {
  return db
    .selectFrom("pack")
    .select(["id", "name", "short_name", "position"])
    .orderBy("position")
    .execute();
}
