import { sql, type Transaction } from "kysely";
import type { Database } from "../../db.ts";
import type { DB } from "../../schema.types.ts";

type DatabaseExecutor = Database | Transaction<DB>;

export async function getAccountIdentity(
  db: DatabaseExecutor,
  accountIdentityId: string,
) {
  return await db
    .selectFrom("account_identity")
    .selectAll()
    .where("id", "=", accountIdentityId)
    .executeTakeFirst();
}

export async function getAccountIdentityByEmail(
  db: DatabaseExecutor,
  email: string,
) {
  return await db
    .selectFrom("account_identity")
    .selectAll()
    .where("provider", "=", "email")
    .where("email", "=", email)
    .executeTakeFirst();
}

export async function getAccountIdentityByEmailOrPendingEmail(
  db: DatabaseExecutor,
  email: string,
) {
  return await db
    .selectFrom("account_identity")
    .selectAll()
    .where("provider", "=", "email")
    .where((eb) =>
      eb.or([eb("email", "=", email), eb("pending_email", "=", email)]),
    )
    .executeTakeFirst();
}

export async function getAccountIdentityByUsername(
  db: DatabaseExecutor,
  username: string,
) {
  return await db
    .selectFrom("account_identity")
    .innerJoin("account", "account.id", "account_identity.account_id")
    .selectAll("account_identity")
    .where("account_identity.provider", "=", "email")
    .where(sql`lower(account.name)`, "=", username.toLowerCase())
    .executeTakeFirst();
}

export async function getAccountIdentityByAccountId(
  db: DatabaseExecutor,
  accountId: string,
) {
  return await db
    .selectFrom("account_identity")
    .selectAll()
    .where("account_id", "=", accountId)
    .where("provider", "=", "email")
    .executeTakeFirst();
}

export async function updateAccountIdentityVerified(
  db: DatabaseExecutor,
  accountIdentityId: string,
) {
  const now = new Date().toISOString();

  return await db
    .updateTable("account_identity")
    .set({ verified_at: now, updated_at: now })
    .where("id", "=", accountIdentityId)
    .executeTakeFirst();
}

export async function activatePendingAccountIdentityEmail(
  db: DatabaseExecutor,
  accountIdentityId: string,
  email: string,
) {
  const now = new Date().toISOString();

  return await db
    .updateTable("account_identity")
    .set({
      email,
      pending_email: null,
      updated_at: now,
      verified_at: now,
    })
    .where("provider", "=", "email")
    .where("id", "=", accountIdentityId)
    .where("pending_email", "=", email)
    .executeTakeFirst();
}

export async function setPendingEmail(
  db: DatabaseExecutor,
  accountIdentityId: string,
  pendingEmail: string | null,
) {
  return await db
    .updateTable("account_identity")
    .set({
      pending_email: pendingEmail,
      updated_at: new Date().toISOString(),
    })
    .where("provider", "=", "email")
    .where("id", "=", accountIdentityId)
    .executeTakeFirst();
}

export async function updatePasswordHash(
  db: DatabaseExecutor,
  accountIdentityId: string,
  passwordHash: string,
) {
  return await db
    .updateTable("account_identity")
    .set({
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .where("provider", "=", "email")
    .where("id", "=", accountIdentityId)
    .executeTakeFirst();
}
