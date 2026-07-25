import { randomUUID } from "node:crypto";
import type { Database } from "../db.ts";

export async function listCampaignManifest(db: Database, accountId: string) {
  return await db
    .selectFrom("account_campaign")
    .select(["id", "revision", "updated_at"])
    .where("account_id", "=", accountId)
    .orderBy("updated_at", "desc")
    .execute();
}

export async function getCampaignBatch(
  db: Database,
  accountId: string,
  ids: string[],
) {
  if (!ids.length) return [];

  return await db
    .selectFrom("account_campaign")
    .selectAll()
    .where("account_id", "=", accountId)
    .where("id", "in", ids)
    .execute();
}

export async function insertCampaignItem(
  db: Database,
  accountId: string,
  id: string,
  data: string,
) {
  const now = new Date().toISOString();

  return await db
    .insertInto("account_campaign")
    .values({
      id,
      account_id: accountId,
      revision: randomUUID(),
      data,
      public: 0,
      created_at: now,
      updated_at: now,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateCampaignItem(
  db: Database,
  accountId: string,
  id: string,
  data: string,
  expectedRevision: string,
) {
  return await db
    .updateTable("account_campaign")
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

export async function deleteCampaignItem(
  db: Database,
  accountId: string,
  id: string,
  expectedRevision: string,
) {
  const result = await db
    .deleteFrom("account_campaign")
    .where("account_id", "=", accountId)
    .where("id", "=", id)
    .where("revision", "=", expectedRevision)
    .executeTakeFirst();

  return result.numDeletedRows > 0n;
}

export async function getCampaignItem(
  db: Database,
  accountId: string,
  id: string,
) {
  return await db
    .selectFrom("account_campaign")
    .selectAll()
    .where("account_id", "=", accountId)
    .where("id", "=", id)
    .executeTakeFirst();
}

// Visibility is server-owned state, deliberately kept out of `revision` and
// `updated_at`: those drive sync reconciliation, and flipping a toggle must not
// invalidate an edit that is in flight from the same device.
export async function setCampaignVisibility(
  db: Database,
  accountId: string,
  id: string,
  isPublic: boolean,
) {
  const result = await db
    .updateTable("account_campaign")
    .set({ public: isPublic ? 1 : 0 })
    .where("account_id", "=", accountId)
    .where("id", "=", id)
    .executeTakeFirst();

  return (result.numUpdatedRows ?? 0n) > 0n;
}

export async function getPublicCampaign(db: Database, id: string) {
  return await db
    .selectFrom("account_campaign")
    .select(["id", "account_id", "data"])
    .where("id", "=", id)
    .where("public", "=", 1)
    .executeTakeFirst();
}

// Scoped to the campaign owner so a campaign can never pull a deck belonging to
// another account into its public payload.
export async function getPublicCampaignDecks(
  db: Database,
  accountId: string,
  deckIds: string[],
) {
  if (!deckIds.length) return [];

  return await db
    .selectFrom("account_deck")
    .select(["id", "data"])
    .where("account_id", "=", accountId)
    .where("id", "in", deckIds)
    .execute();
}
