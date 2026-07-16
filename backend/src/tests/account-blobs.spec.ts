import { randomUUID } from "node:crypto";
import { describe, expect } from "vitest";
import { createAccount } from "../db/queries/auth/accounts.ts";
import { updateAccountIdentityVerified } from "../db/queries/auth/identities.ts";
import { hashPassword } from "../lib/auth/crypto.ts";
import { createSession } from "../lib/auth/sessions.ts";
import { test } from "./test-utils.ts";

describe("account blobs", () => {
  describe("folders", () => {
    test("GET returns 404 when no folders exist", async ({ dependencies }) => {
      const { cookie } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "nofolders@example.com",
      );

      const res = await dependencies.app.request("/v2/account/folders", {
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(404);
    });

    test("PUT + GET round-trip for folders", async ({ dependencies }) => {
      const { cookie } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "folders@example.com",
      );

      const foldersState = { folders: {}, deckFolders: {} };

      // PUT creates the blob.
      const putRes = await dependencies.app.request("/v2/account/folders", {
        method: "PUT",
        body: JSON.stringify({
          state: foldersState,
          expectedRevision: null,
        }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      });
      expect(putRes.status).toBe(200);
      const putBody = (await putRes.json()) as {
        state: unknown;
        revision: string;
      };
      expect(putBody.revision).toBeDefined();

      // GET returns what we put.
      const getRes = await dependencies.app.request("/v2/account/folders", {
        headers: { Cookie: cookie },
      });
      expect(getRes.status).toBe(200);
      const getBody = (await getRes.json()) as {
        state: unknown;
        revision: string;
      };
      expect(getBody.revision).toBe(putBody.revision);
    });

    test("PUT returns 409 on revision conflict", async ({ dependencies }) => {
      const { cookie, account } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "folders-conflict@example.com",
      );

      // Seed a blob directly.
      const existingRevision = randomUUID();
      await dependencies.db
        .insertInto("account_folder")
        .values({
          account_id: account.id,
          revision: existingRevision,
          state: JSON.stringify({ folders: {}, deckFolders: {} }),
        })
        .execute();

      const res = await dependencies.app.request("/v2/account/folders", {
        method: "PUT",
        body: JSON.stringify({
          state: { folders: {}, deckFolders: {} },
          expectedRevision: randomUUID(), // Wrong revision.
        }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      });
      expect(res.status).toBe(409);
    });
  });

  describe("settings", () => {
    test("GET returns 404 when no settings exist", async ({ dependencies }) => {
      const { cookie } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "nosettings@example.com",
      );

      const res = await dependencies.app.request("/v2/account/settings", {
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(404);
    });

    test("PUT + GET round-trip for settings", async ({ dependencies }) => {
      const { cookie } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "settings@example.com",
      );

      const settings = { locale: "en", theme: "dark" };

      const putRes = await dependencies.app.request("/v2/account/settings", {
        method: "PUT",
        body: JSON.stringify({
          settings,
          expectedRevision: null,
        }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      });
      expect(putRes.status).toBe(200);
      const putBody = (await putRes.json()) as {
        settings: { locale: string };
        revision: string;
      };
      expect(putBody.settings.locale).toBe("en");

      const getRes = await dependencies.app.request("/v2/account/settings", {
        headers: { Cookie: cookie },
      });
      expect(getRes.status).toBe(200);
      const getBody = (await getRes.json()) as {
        settings: { locale: string };
      };
      expect(getBody.settings.locale).toBe("en");
    });

    test("PUT returns 409 on revision conflict", async ({ dependencies }) => {
      const { cookie, account } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "settings-conflict@example.com",
      );

      await dependencies.db
        .insertInto("account_settings")
        .values({
          account_id: account.id,
          revision: randomUUID(),
          settings: JSON.stringify({ locale: "en" }),
        })
        .execute();

      const res = await dependencies.app.request("/v2/account/settings", {
        method: "PUT",
        body: JSON.stringify({
          settings: { locale: "de" },
          expectedRevision: randomUUID(),
        }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      });
      expect(res.status).toBe(409);
    });
  });

  describe("achievements", () => {
    test("GET returns 404 when no achievements exist", async ({
      dependencies,
    }) => {
      const { cookie } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "noachieve@example.com",
      );

      const res = await dependencies.app.request("/v2/account/achievements", {
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(404);
    });

    test("PUT + GET round-trip for achievements", async ({ dependencies }) => {
      const { cookie } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "achieve@example.com",
      );

      const achievements = { completed: { first: true } };

      const putRes = await dependencies.app.request(
        "/v2/account/achievements",
        {
          method: "PUT",
          body: JSON.stringify({
            state: achievements,
            expectedRevision: null,
          }),
          headers: { Cookie: cookie, "Content-Type": "application/json" },
        },
      );
      expect(putRes.status).toBe(200);
      const putBody = (await putRes.json()) as {
        state: { completed: { first: boolean } };
        revision: string;
      };
      expect(putBody.state.completed.first).toBe(true);

      const getRes = await dependencies.app.request(
        "/v2/account/achievements",
        {
          headers: { Cookie: cookie },
        },
      );
      expect(getRes.status).toBe(200);
      const getBody = (await getRes.json()) as {
        state: { completed: { first: boolean } };
      };
      expect(getBody.state.completed.first).toBe(true);
    });

    test("PUT returns 409 on revision conflict", async ({ dependencies }) => {
      const { cookie, account } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "achieve-conflict@example.com",
      );

      await dependencies.db
        .insertInto("account_achievements")
        .values({
          account_id: account.id,
          revision: randomUUID(),
          state: JSON.stringify({ completed: {} }),
        })
        .execute();

      const res = await dependencies.app.request("/v2/account/achievements", {
        method: "PUT",
        body: JSON.stringify({
          state: { completed: {} },
          expectedRevision: randomUUID(),
        }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      });
      expect(res.status).toBe(409);
    });
  });

  test("all blob routes require authentication", async ({ dependencies }) => {
    for (const path of [
      "/v2/account/folders",
      "/v2/account/settings",
      "/v2/account/achievements",
    ]) {
      const getRes = await dependencies.app.request(path);
      expect(getRes.status).toBe(401);

      const putRes = await dependencies.app.request(path, {
        method: "PUT",
        body: JSON.stringify({ state: {}, expectedRevision: null }),
        headers: { "Content-Type": "application/json" },
      });
      expect(putRes.status).toBe(401);
    }
  });
});

async function createVerifiedAccount(
  db: ReturnType<typeof import("../db/db.ts").getDatabase>,
  config: { SESSION_COOKIE_NAME: string },
  email: string,
  name = `user_${randomUUID()}`,
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
