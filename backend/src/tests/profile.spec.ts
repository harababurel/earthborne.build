import { describe, expect } from "vitest";
import { createAccount } from "../db/queries/auth/accounts.ts";
import { updateAccountIdentityVerified } from "../db/queries/auth/identities.ts";
import { hashPassword } from "../lib/auth/crypto.ts";
import { createSession } from "../lib/auth/sessions.ts";
import { test } from "./test-utils.ts";

describe("PATCH /v2/account/profile", () => {
  test("returns 401 when unauthenticated", async ({ dependencies }) => {
    const res = await dependencies.app.request("/v2/account/profile", {
      method: "PATCH",
      body: JSON.stringify({ username: "renamed" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(401);
  });

  test("returns 403 when profile is incomplete", async ({ dependencies }) => {
    const result = await createAccount(dependencies.db, {
      name: "incomplete",
      email: "incomplete@example.com",
      passwordHash: await hashPassword("password123"),
      profileCompletedAt: null,
    });
    await updateAccountIdentityVerified(
      dependencies.db,
      result.accountIdentity.id,
    );

    const { token } = await createSession(
      dependencies.db,
      result.account.id,
      1,
    );
    const cookie = `${dependencies.config.SESSION_COOKIE_NAME}=${token}`;

    const res = await dependencies.app.request("/v2/account/profile", {
      method: "PATCH",
      body: JSON.stringify({ username: "renamed" }),
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });
    expect(res.status).toBe(403);
  });

  test("returns 400 when the username is already taken", async ({
    dependencies,
  }) => {
    // Create another account that owns "existing_name".
    await createAccount(dependencies.db, {
      name: "existing_name",
      email: "existing@example.com",
      passwordHash: await hashPassword("password123"),
      profileCompletedAt: new Date().toISOString(),
    });

    // Create the account we'll test with.
    const { account, cookie } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "profile@example.com",
      "test_user",
    );

    const res = await dependencies.app.request("/v2/account/profile", {
      method: "PATCH",
      body: JSON.stringify({ username: "existing_name" }),
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);

    // Verify the name was not changed.
    const row = await dependencies.db
      .selectFrom("account")
      .select("name")
      .where("id", "=", account.id)
      .executeTakeFirstOrThrow();
    expect(row.name).toBe("test_user");
  });

  test("renames the account successfully", async ({ dependencies }) => {
    const { account, cookie } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "rename@example.com",
      "old_name",
    );

    const res = await dependencies.app.request("/v2/account/profile", {
      method: "PATCH",
      body: JSON.stringify({ username: "new_name" }),
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });
    expect(res.status).toBe(200);

    const row = await dependencies.db
      .selectFrom("account")
      .select("name")
      .where("id", "=", account.id)
      .executeTakeFirstOrThrow();
    expect(row.name).toBe("new_name");
  });
});

async function createVerifiedAccount(
  db: ReturnType<typeof import("../db/db.ts").getDatabase>,
  config: { SESSION_COOKIE_NAME: string },
  email: string,
  name: string,
) {
  const result = await createAccount(db, {
    name,
    email,
    passwordHash: await hashPassword("password123"),
    profileCompletedAt: new Date().toISOString(),
  });
  await updateAccountIdentityVerified(db, result.accountIdentity.id);
  const { token } = await createSession(db, result.account.id, 720);
  const cookie = `${config.SESSION_COOKIE_NAME}=${token}`;
  return { account: result.account, identity: result.accountIdentity, cookie };
}
