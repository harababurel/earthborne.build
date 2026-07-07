import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Transaction } from "kysely";
import type { Database } from "../../db/db.ts";
import { updateAccountActivity } from "../../db/queries/auth/accounts.ts";
import type { DB } from "../../db/schema.types.ts";

type DatabaseExecutor = Database | Transaction<DB>;

export async function createSession(
  db: DatabaseExecutor,
  accountId: string,
  expiryHours: number,
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);
  const token = generateSessionToken();

  const session = await db
    .insertInto("session")
    .values({
      id: randomUUID(),
      account_id: accountId,
      token_hash: hashSessionToken(token),
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      last_activity_at: now.toISOString(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  await updateAccountActivity(db, accountId);

  return { ...session, token };
}

export async function deleteSession(db: DatabaseExecutor, token: string) {
  return await db
    .deleteFrom("session")
    .where("token_hash", "=", hashSessionToken(token))
    .executeTakeFirst();
}

export async function deleteSessionsByAccountId(
  db: DatabaseExecutor,
  accountId: string,
) {
  return await db
    .deleteFrom("session")
    .where("account_id", "=", accountId)
    .executeTakeFirst();
}

export async function deleteOtherSessionsByAccountId(
  db: DatabaseExecutor,
  accountId: string,
  currentToken: string,
) {
  return await db
    .deleteFrom("session")
    .where("account_id", "=", accountId)
    .where("token_hash", "!=", hashSessionToken(currentToken))
    .executeTakeFirst();
}

export async function getSession(db: DatabaseExecutor, token: string) {
  return await db
    .selectFrom("session")
    .selectAll()
    .where("token_hash", "=", hashSessionToken(token))
    .where("expires_at", ">", new Date().toISOString())
    .orderBy("last_activity_at", "desc")
    .executeTakeFirst();
}

export async function cleanupExpiredSessions(db: DatabaseExecutor) {
  return await db
    .deleteFrom("session")
    .where("expires_at", "<", new Date().toISOString())
    .executeTakeFirst();
}

export async function updateSessionActivity(
  db: DatabaseExecutor,
  token: string,
  accountId: string,
  expiryHours: number,
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

  const result = await db
    .updateTable("session")
    .set({
      last_activity_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .where("token_hash", "=", hashSessionToken(token))
    .executeTakeFirst();

  await updateAccountActivity(db, accountId);

  return result;
}

function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
