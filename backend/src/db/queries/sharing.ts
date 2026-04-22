import type { Database } from "../db.ts";
import type { SharedDeck } from "../schema.types.ts";

export async function getSharedDeck(db: Database, id: string) {
  return await db
    .selectFrom("shared_deck")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export async function createSharedDeck(
  db: Database,
  deck: Omit<SharedDeck, "created_at" | "updated_at">,
) {
  const now = new Date().toISOString();
  await db
    .insertInto("shared_deck")
    .values({
      ...deck,
      created_at: now,
      updated_at: now,
    })
    .execute();
}

export async function updateSharedDeck(
  db: Database,
  id: string,
  clientId: string,
  data: string,
  history: string,
) {
  const now = new Date().toISOString();
  await db
    .updateTable("shared_deck")
    .set({
      data,
      history,
      updated_at: now,
    })
    .where("id", "=", id)
    .where("client_id", "=", clientId)
    .execute();
}

export async function deleteSharedDeck(
  db: Database,
  id: string,
  clientId: string,
) {
  await db
    .deleteFrom("shared_deck")
    .where("id", "=", id)
    .where("client_id", "=", clientId)
    .execute();
}
