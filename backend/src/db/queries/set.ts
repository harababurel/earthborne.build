import type { Database } from "../db.ts";
import { getTranslations } from "./translation.ts";

export async function getAllSets(db: Database, locale?: string) {
  const translations = await getTranslations(db, locale, ["set"]);
  const rows = await db
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

  return rows.map((row) => ({
    ...row,
    name: translations.get(`set.${row.id}.name`) ?? row.name,
  }));
}
