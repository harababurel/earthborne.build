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

export function assertEmailCooldown(
  tokenCreatedAt: string,
  cooldownMs = 5 * 60 * 1000,
) {
  const retryAfter = new Date(new Date(tokenCreatedAt).getTime() + cooldownMs);

  if (Date.now() < retryAfter.getTime()) {
    throw new HTTPException(429, {
      message: "Please wait before requesting another email",
      cause: { retryAfter: retryAfter.toISOString() },
    });
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
