import assert from "node:assert";
import type { Selectable } from "kysely";
import type { Database } from "../db.ts";
import type { Card } from "../schema.types.ts";

export async function getAllCards(db: Database): Promise<Selectable<Card>[]> {
  return db.selectFrom("card").selectAll().orderBy("pack_id").orderBy("position").execute();
}

export async function getCardByCode(
  db: Database,
  code: string,
): Promise<Selectable<Card>> {
  const card = await db
    .selectFrom("card")
    .selectAll()
    .where("code", "=", code)
    .limit(1)
    .executeTakeFirst();

  assert(card, `Card with code ${code} not found.`);
  return card;
}
