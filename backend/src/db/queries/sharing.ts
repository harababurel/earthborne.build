import { sql } from "kysely";
import type { Database } from "../db.ts";
import type { SharedDeck } from "../schema.types.ts";

export async function getSharedDeck(db: Database, id: string) {
  return await db
    .selectFrom("shared_deck")
    .leftJoin("account", "account.id", "shared_deck.account_id")
    .selectAll("shared_deck")
    .select(
      sql<
        string | null
      >`case when account.profile_completed_at is not null then account.name else null end`.as(
        "author_name",
      ),
    )
    .where("shared_deck.id", "=", id)
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
  accountId: string | null | undefined,
  data: string,
  history: string,
) {
  const now = new Date().toISOString();
  let query = db
    .updateTable("shared_deck")
    .set({
      data,
      history,
      updated_at: now,
    })
    .where("id", "=", id);

  if (accountId) {
    query = query.where((eb) =>
      eb.or([eb("client_id", "=", clientId), eb("account_id", "=", accountId)]),
    );
  } else {
    query = query.where("client_id", "=", clientId);
  }

  const result = await query.executeTakeFirst();
  return result.numUpdatedRows > 0n;
}

export async function deleteSharedDeck(
  db: Database,
  id: string,
  clientId: string,
  accountId: string | null | undefined,
) {
  let query = db.deleteFrom("shared_deck").where("id", "=", id);

  if (accountId) {
    query = query.where((eb) =>
      eb.or([eb("client_id", "=", clientId), eb("account_id", "=", accountId)]),
    );
  } else {
    query = query.where("client_id", "=", clientId);
  }

  const result = await query.executeTakeFirst();
  return result.numDeletedRows > 0n;
}
