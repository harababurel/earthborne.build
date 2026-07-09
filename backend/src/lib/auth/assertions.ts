import { HTTPException } from "hono/http-exception";
import type { Database } from "../../db/db.ts";
import { getAccountIdentityByEmailOrPendingEmail } from "../../db/queries/auth/identities.ts";
import {
  getLatestVerificationToken,
  type VerificationTokenType,
} from "../../db/queries/auth/verification-tokens.ts";

export async function assertEmailAvailable(
  db: Database,
  email: string,
  excludeAccountIdentityId?: string,
) {
  const existingEmailIdentity = await getAccountIdentityByEmailOrPendingEmail(
    db,
    email,
  );

  if (
    existingEmailIdentity &&
    existingEmailIdentity.id !== excludeAccountIdentityId
  ) {
    throw new HTTPException(400, {
      message: "An account is already registered for this email",
    });
  }
}

export async function assertVerificationTokenCooldown(
  db: Database,
  email: string,
  tokenType: VerificationTokenType,
) {
  const latestToken = await getLatestVerificationToken(db, email, tokenType);

  if (latestToken) {
    assertEmailCooldown(latestToken.created_at);
  }
}

export async function isVerificationTokenCooldownActive(
  db: Database,
  email: string,
  tokenType: VerificationTokenType,
  cooldownMs = 5 * 60 * 1000,
) {
  const latestToken = await getLatestVerificationToken(db, email, tokenType);
  if (!latestToken) return false;

  return Date.now() < new Date(latestToken.created_at).getTime() + cooldownMs;
}

export function assertEmailCooldown(
  tokenCreatedAt: string,
  cooldownMs = 5 * 60 * 1000,
) {
  if (Date.now() < new Date(tokenCreatedAt).getTime() + cooldownMs) {
    throwEmailCooldownError(tokenCreatedAt, cooldownMs);
  }
}

export function isEmail(input: string): boolean {
  return input.includes("@");
}

export function throwInvalidResetTokenError(): never {
  throw new HTTPException(400, {
    message: "Invalid or expired password reset token",
  });
}

function throwEmailCooldownError(
  tokenCreatedAt = new Date().toISOString(),
  cooldownMs = 5 * 60 * 1000,
): never {
  const retryAfter = new Date(new Date(tokenCreatedAt).getTime() + cooldownMs);

  throw new HTTPException(429, {
    message: "Please wait before requesting another email",
    cause: { retryAfter: retryAfter.toISOString() },
  });
}
