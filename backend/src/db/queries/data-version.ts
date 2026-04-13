import type { Database } from "../db.ts";

export async function getAppDataVersions(db: Database) {
  const result = await db
    .selectFrom("card")
    .select((eb) => eb.fn.countAll<number>().as("card_count"))
    .executeTakeFirst();

  return {
    card_count: result?.card_count ?? 0,
  };
}
