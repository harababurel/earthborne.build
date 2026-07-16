import { describe, expect } from "vitest";
import { createAccount } from "../db/queries/auth/accounts.ts";
import { updateAccountIdentityVerified } from "../db/queries/auth/identities.ts";
import { createSession } from "../lib/auth/sessions.ts";
import {
  createVerifiedAccount,
  TEST_PASSWORD_HASH,
  test,
} from "./test-utils.ts";

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
      passwordHash: TEST_PASSWORD_HASH,
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
      passwordHash: TEST_PASSWORD_HASH,
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
