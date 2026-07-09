import { randomUUID } from "node:crypto";
import { describe, expect } from "vitest";
import {
  accountNameExists,
  createAccount,
} from "../db/queries/auth/accounts.ts";
import {
  activatePendingAccountIdentityEmail,
  getAccountIdentityByEmail,
  setPendingEmail,
} from "../db/queries/auth/identities.ts";
import {
  cleanupExpiredTokens,
  consumeVerificationToken,
  createVerificationToken,
  EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS,
} from "../db/queries/auth/verification-tokens.ts";
import { assertEmailAvailable } from "../lib/auth/assertions.ts";
import {
  generateRandomToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "../lib/auth/crypto.ts";
import {
  cleanupExpiredSessions,
  createSession,
  deleteSession,
  getSession,
} from "../lib/auth/sessions.ts";
import { test } from "./test-utils.ts";

describe("auth crypto", () => {
  test("hashes and verifies passwords", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(await verifyPassword("correct horse battery staple", hash)).toBe(
      true,
    );
    expect(await verifyPassword("wrong password", hash)).toBe(false);
    expect(await verifyPassword("correct horse battery staple", "bad")).toBe(
      false,
    );
  });
});

describe("sessions", () => {
  test("creates, reads, expires, and deletes sessions", async ({
    dependencies,
  }) => {
    const { account } = await createTestAccount(dependencies.db);

    const session = await createSession(dependencies.db, account.id, 1);

    await expect(
      getSession(dependencies.db, session.token),
    ).resolves.toMatchObject({
      account_id: account.id,
      id: session.id,
    });

    await dependencies.db
      .updateTable("session")
      .set({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .where("id", "=", session.id)
      .execute();

    await expect(
      getSession(dependencies.db, session.token),
    ).resolves.toBeUndefined();

    await cleanupExpiredSessions(dependencies.db);

    const secondSession = await createSession(dependencies.db, account.id, 1);
    await deleteSession(dependencies.db, secondSession.token);

    await expect(
      getSession(dependencies.db, secondSession.token),
    ).resolves.toBeUndefined();
  });
});

describe("verification tokens", () => {
  test("creates, consumes once, expires, and cleans up tokens", async ({
    dependencies,
  }) => {
    const { accountIdentity } = await createTestAccount(dependencies.db);
    const token = generateRandomToken();

    const verificationToken = await createVerificationToken(dependencies.db, {
      accountIdentityId: accountIdentity.id,
      email: accountIdentity.email ?? "",
      tokenHash: hashToken(token),
      tokenType: "email_verification",
      expiryHours: EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS,
    });

    await expect(
      consumeVerificationToken(
        dependencies.db,
        hashToken(token),
        "email_verification",
      ),
    ).resolves.toMatchObject({ id: verificationToken.id });

    await expect(
      consumeVerificationToken(
        dependencies.db,
        hashToken(token),
        "email_verification",
      ),
    ).resolves.toBeUndefined();

    const expiredToken = await createVerificationToken(dependencies.db, {
      accountIdentityId: accountIdentity.id,
      email: accountIdentity.email ?? "",
      tokenHash: hashToken(generateRandomToken()),
      tokenType: "password_reset",
      expiryHours: 1,
    });

    await dependencies.db
      .updateTable("verification_token")
      .set({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .where("id", "=", expiredToken.id)
      .execute();

    await expect(
      consumeVerificationToken(
        dependencies.db,
        expiredToken.token_hash,
        "password_reset",
      ),
    ).resolves.toBeUndefined();

    await cleanupExpiredTokens(dependencies.db);

    await expect(
      dependencies.db
        .selectFrom("verification_token")
        .selectAll()
        .where("id", "=", expiredToken.id)
        .executeTakeFirst(),
    ).resolves.toBeUndefined();
  });
});

describe("account and identity assertions", () => {
  test("enforces email availability for email and pending_email", async ({
    dependencies,
  }) => {
    const { accountIdentity } = await createTestAccount(
      dependencies.db,
      "one@example.com",
    );

    await expect(
      assertEmailAvailable(dependencies.db, "one@example.com"),
    ).rejects.toThrow("An account is already registered for this email");

    await expect(
      assertEmailAvailable(
        dependencies.db,
        "one@example.com",
        accountIdentity.id,
      ),
    ).resolves.toBeUndefined();

    await setPendingEmail(
      dependencies.db,
      accountIdentity.id,
      "two@example.com",
    );

    await expect(
      assertEmailAvailable(dependencies.db, "two@example.com"),
    ).rejects.toThrow("An account is already registered for this email");

    await activatePendingAccountIdentityEmail(
      dependencies.db,
      accountIdentity.id,
      "two@example.com",
    );

    await expect(
      getAccountIdentityByEmail(dependencies.db, "two@example.com"),
    ).resolves.toMatchObject({ id: accountIdentity.id });
  });

  test("enforces case-insensitive account name uniqueness", async ({
    dependencies,
  }) => {
    const { account } = await createTestAccount(
      dependencies.db,
      "foo@example.com",
      "Foo",
    );

    await expect(accountNameExists(dependencies.db, "foo")).resolves.toBe(true);
    await expect(
      accountNameExists(dependencies.db, "foo", account.id),
    ).resolves.toBe(false);

    await expect(
      createTestAccount(dependencies.db, "bar@example.com", "foo"),
    ).rejects.toThrow();
  });

  test("surfaces duplicate email inserts as unique-index constraint errors", async ({
    dependencies,
  }) => {
    await createTestAccount(dependencies.db, "race@example.com");

    await expect(
      createTestAccount(dependencies.db, "race@example.com"),
    ).rejects.toMatchObject({ code: "SQLITE_CONSTRAINT_UNIQUE" });
  });
});

async function createTestAccount(
  db: Parameters<typeof createAccount>[0],
  email = `${randomUUID()}@example.com`,
  name = `user_${randomUUID()}`,
) {
  return await createAccount(db, {
    name,
    email,
    passwordHash: await hashPassword("password123"),
    profileCompletedAt: null,
  });
}
