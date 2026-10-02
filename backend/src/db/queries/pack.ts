import type { Pack } from "@earthborne-build/shared";
import type { Database } from "../db.ts";
import { getTranslations } from "./translation.ts";

export async function getAllPacks(
  db: Database,
  locale?: string,
): Promise<Pack[]> {
  const translations = await getTranslations(db, locale, ["pack"]);
  const rows = await db
    .selectFrom("pack")
    .select(["id", "id as code", "name", "short_name", "position"])
    .orderBy("position")
    .execute();

  return rows.map((row) => ({
    ...row,
    real_name: row.name,
    name: translations.get(`pack.${row.id}.name`) ?? row.name,
    short_name: translations.get(`pack.${row.id}.short_name`) ?? row.short_name,
  }));
}
