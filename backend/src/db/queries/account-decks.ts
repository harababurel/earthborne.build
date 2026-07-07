import { randomUUID } from "node:crypto";
import type { Database } from "../db.ts";

export async function listDeckManifest(db: Database, accountId: string) {
  return await db
    .selectFrom("account_deck")
    .select(["id", "revision", "updated_at"])
    .where("account_id", "=", accountId)
    .orderBy("updated_at", "desc")
    .execute();
}

export async function getDeckBatch(
  db: Database,
  accountId: string,
  ids: string[],
) {
  if (!ids.length) return [];

  return await db
    .selectFrom("account_deck")
    .selectAll()
    .where("account_id", "=", accountId)
    .where("id", "in", ids)
    .execute();
}

export async function insertDeckItem(
  db: Database,
  accountId: string,
  id: string,
  data: string,
) {
  const now = new Date().toISOString();

  return await db
    .insertInto("account_deck")
    .values({
      id,
      account_id: accountId,
      revision: randomUUID(),
      data,
      created_at: now,
      updated_at: now,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateDeckItem(
  db: Database,
  accountId: string,
  id: string,
  data: string,
  expectedRevision: string,
) {
  return await db
    .updateTable("account_deck")
    .set({
      revision: randomUUID(),
      data,
      updated_at: new Date().toISOString(),
    })
    .where("account_id", "=", accountId)
    .where("id", "=", id)
    .where("revision", "=", expectedRevision)
    .returningAll()
    .executeTakeFirst();
}

export async function deleteDeckItem(
  db: Database,
  accountId: string,
  id: string,
  expectedRevision: string,
) {
  const result = await db
    .deleteFrom("account_deck")
    .where("account_id", "=", accountId)
    .where("id", "=", id)
    .where("revision", "=", expectedRevision)
    .executeTakeFirst();

  return result.numDeletedRows > 0n;
}

export async function getDeckItem(db: Database, accountId: string, id: string) {
  return await db
    .selectFrom("account_deck")
    .selectAll()
    .where("account_id", "=", accountId)
    .where("id", "=", id)
    .executeTakeFirst();
}

export function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Error &&
    (error as { code?: string }).code === "SQLITE_CONSTRAINT_PRIMARYKEY"
  );
}
