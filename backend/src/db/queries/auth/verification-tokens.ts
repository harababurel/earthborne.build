import { randomUUID } from "node:crypto";
import type { Transaction } from "kysely";
import type { Database } from "../../db.ts";
import type { DB, VerificationToken } from "../../schema.types.ts";

type DatabaseExecutor = Database | Transaction<DB>;

export const EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
export const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;

export type VerificationTokenType = VerificationToken["token_type"];

export interface CreateVerificationTokenParams {
  accountIdentityId: string | null;
  email: string;
  tokenHash: string;
  tokenType: VerificationTokenType;
  expiryHours: number;
}

export async function createVerificationToken(
  db: DatabaseExecutor,
  params: CreateVerificationTokenParams,
) {
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + params.expiryHours * 60 * 60 * 1000,
  );

  return await db
    .insertInto("verification_token")
    .values({
      id: randomUUID(),
      account_identity_id: params.accountIdentityId,
      email: params.email,
      token_hash: params.tokenHash,
      token_type: params.tokenType,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteVerificationTokensByEmail(
  db: DatabaseExecutor,
  email: string,
  tokenType: VerificationTokenType,
) {
  return await db
    .deleteFrom("verification_token")
    .where("email", "=", email)
    .where("token_type", "=", tokenType)
    .executeTakeFirst();
}

export async function replaceVerificationToken(
  db: DatabaseExecutor,
  params: CreateVerificationTokenParams,
) {
  await deleteVerificationTokensByEmail(db, params.email, params.tokenType);
  return await createVerificationToken(db, params);
}

export async function consumeVerificationToken(
  db: DatabaseExecutor,
  tokenHash: string,
  tokenType: VerificationTokenType,
) {
  return await db
    .deleteFrom("verification_token")
    .returningAll()
    .where("token_hash", "=", tokenHash)
    .where("token_type", "=", tokenType)
    .where("expires_at", ">", new Date().toISOString())
    .executeTakeFirst();
}

export async function getLatestVerificationToken(
  db: DatabaseExecutor,
  email: string,
  tokenType: VerificationTokenType,
) {
  return await db
    .selectFrom("verification_token")
    .selectAll()
    .where("email", "=", email)
    .where("token_type", "=", tokenType)
    .orderBy("created_at", "desc")
    .executeTakeFirst();
}

export async function cleanupExpiredTokens(db: DatabaseExecutor) {
  return await db
    .deleteFrom("verification_token")
    .where("expires_at", "<", new Date().toISOString())
    .executeTakeFirst();
}
