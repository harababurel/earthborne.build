import { randomUUID } from "node:crypto";
import { sql, type Transaction } from "kysely";
import type { Database } from "../../db.ts";
import type { DB } from "../../schema.types.ts";

type DatabaseExecutor = Database | Transaction<DB>;

export interface CreateAccountParams {
  name: string;
  email: string;
  passwordHash: string;
  profileCompletedAt: string | null;
}

export async function createAccount(
  db: DatabaseExecutor,
  params: CreateAccountParams,
) {
  const now = new Date().toISOString();

  const account = await db
    .insertInto("account")
    .values({
      id: randomUUID(),
      name: params.name,
      created_at: now,
      updated_at: now,
      profile_completed_at: params.profileCompletedAt,
      last_activity_at: now,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  const accountIdentity = await db
    .insertInto("account_identity")
    .values({
      id: randomUUID(),
      account_id: account.id,
      provider: "email",
      email: params.email,
      password_hash: params.passwordHash,
      pending_email: null,
      verified_at: null,
      created_at: now,
      updated_at: now,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return { account, accountIdentity };
}

export async function accountNameExists(
  db: DatabaseExecutor,
  name: string,
  excludeAccountId?: string,
) {
  let query = db
    .selectFrom("account")
    .select(["id"])
    .where(sql`lower(name)`, "=", name.toLowerCase());

  if (excludeAccountId) {
    query = query.where("id", "!=", excludeAccountId);
  }

  return (await query.executeTakeFirst()) != null;
}

export async function completeAccountProfile(
  db: DatabaseExecutor,
  accountId: string,
  name: string,
) {
  const now = new Date().toISOString();

  return await db
    .updateTable("account")
    .set({ name, profile_completed_at: now, updated_at: now })
    .where("id", "=", accountId)
    .executeTakeFirst();
}

export async function updateAccountActivity(
  db: DatabaseExecutor,
  accountId: string,
) {
  return await db
    .updateTable("account")
    .set({ last_activity_at: new Date().toISOString() })
    .where("id", "=", accountId)
    .executeTakeFirst();
}

export async function findAccountForAuth(
  db: DatabaseExecutor,
  accountId: string,
) {
  return await db
    .selectFrom("account")
    .selectAll()
    .where("id", "=", accountId)
    .executeTakeFirst();
}

export async function findAccountByUsername(
  db: DatabaseExecutor,
  username: string,
) {
  return await db
    .selectFrom("account")
    .select(["id", "name"])
    .where(sql`lower(name)`, "=", username.toLowerCase())
    .executeTakeFirst();
}

export async function renameAccount(
  db: DatabaseExecutor,
  accountId: string,
  name: string,
) {
  return await db
    .updateTable("account")
    .set({ name, updated_at: new Date().toISOString() })
    .where("id", "=", accountId)
    .executeTakeFirst();
}

export async function deleteAccount(db: DatabaseExecutor, accountId: string) {
  return await db
    .deleteFrom("account")
    .where("id", "=", accountId)
    .executeTakeFirst();
}
