import type { Database } from "../db.ts";

export async function getAllSets(db: Database) {
  return await db
    .selectFrom("card_set as s")
    .leftJoin("card as c", "s.id", "c.set_id")
    .select([
      "s.id",
      "s.id as code",
      "s.name",
      "s.type_id",
      "s.size",
      "c.pack_id as pack_code",
    ])
    .groupBy("s.id")
    .execute();
}
