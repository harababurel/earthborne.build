import { randomUUID } from "node:crypto";
import type { Campaign, Deck } from "@earthborne-build/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appFactory } from "../app.ts";
import { applySqlFiles } from "../db/db.helpers.ts";
import { type Database, getDatabase } from "../db/db.ts";
import { createAccount } from "../db/queries/auth/accounts.ts";
import { updateAccountIdentityVerified } from "../db/queries/auth/identities.ts";
import { hashPassword } from "../lib/auth/crypto.ts";
import { createSession } from "../lib/auth/sessions.ts";
import { type Config, configFromEnv } from "../lib/config.ts";
import { CaptureMailer } from "../lib/email/mailer.ts";

type TestContext = {
  app: ReturnType<typeof appFactory>;
  config: Config;
  db: Database;
  mailer: CaptureMailer;
};

let ctx: TestContext;

beforeEach(async () => {
  const db = getDatabase(":memory:");
  await applySqlFiles(db, "../db/migrations");
  const config = configFromEnv();
  const mailer = new CaptureMailer();
  const app = appFactory(config, db, mailer);
  ctx = { app, config, db, mailer };
});

afterEach(async () => {
  await ctx.db.destroy();
});

describe("account auth routes", () => {
  it("signs up, verifies email, logs in, and returns the incomplete profile session", async () => {
    const signup = await signupAccount("ranger@example.com");
    expect(signup.status).toBe(201);
    expect(ctx.mailer.mails).toHaveLength(1);

    const token = extractToken(ctx.mailer.mails[0]?.body);

    const verify = await ctx.app.request("/v2/account/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
      headers: { "Content-Type": "application/json" },
    });
    expect(verify.status).toBe(200);

    const login = await loginAccount("ranger@example.com");
    expect(login.status).toBe(200);

    const me = await ctx.app.request("/v2/account/auth/me", {
      headers: { Cookie: getCookie(login) },
    });
    expect(me.status).toBe(200);
    await expect(me.json()).resolves.toMatchObject({
      account: { profileComplete: false },
      identities: [{ email: "ranger@example.com", verified: true }],
    });
  });

  it("rejects invalid login states without account enumeration", async () => {
    await signupAccount("unverified@example.com");

    const duplicate = await signupAccount("unverified@example.com");
    expect(duplicate.status).toBe(400);

    const unverified = await loginAccount("unverified@example.com");
    expect(unverified.status).toBe(403);

    const wrongPassword = await loginAccount("unverified@example.com", "wrong");
    expect(wrongPassword.status).toBe(401);

    const unknown = await loginAccount("missing@example.com");
    expect(unknown.status).toBe(401);
    await expect(unknown.json()).resolves.toMatchObject({
      message: "Invalid email or password",
    });
  });

  it("resends verification only for eligible identities and enforces cooldown", async () => {
    const unknown = await ctx.app.request(
      "/v2/account/auth/resend-verification",
      {
        method: "POST",
        body: JSON.stringify({ email: "missing@example.com" }),
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(unknown.status).toBe(200);
    expect(ctx.mailer.mails).toHaveLength(0);

    await signupAccount("cooldown@example.com");
    const resend = await ctx.app.request(
      "/v2/account/auth/resend-verification",
      {
        method: "POST",
        body: JSON.stringify({ email: "cooldown@example.com" }),
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(resend.status).toBe(429);
  });

  it("completes profile and uploads local data with deck id remapping", async () => {
    const existing = await createAccount(ctx.db, {
      name: "existing",
      email: "existing@example.com",
      passwordHash: await hashPassword("password123"),
      profileCompletedAt: new Date().toISOString(),
    });
    await ctx.db
      .insertInto("account_deck")
      .values({
        id: "deck-a",
        account_id: existing.account.id,
        revision: randomUUID(),
        data: JSON.stringify(makeDeck("deck-a")),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    const cookie = await signupVerifyLogin("profile@example.com");
    const taken = await ctx.app.request("/v2/account/auth/complete-profile", {
      method: "POST",
      body: JSON.stringify({ username: "existing" }),
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });
    expect(taken.status).toBe(400);

    const complete = await ctx.app.request(
      "/v2/account/auth/complete-profile",
      {
        method: "POST",
        body: JSON.stringify({
          username: "new_ranger",
          uploads: {
            decks: [makeDeck("deck-a"), makeDeck("deck-b")],
            campaigns: [makeCampaign("campaign-a", ["deck-a", "deck-b"])],
            folders: {
              folders: {
                folder: { id: "folder", name: "Folder" },
              },
              deckFolders: {
                "deck-a": "folder",
                "deck-b": "folder",
              },
            },
            settings: { locale: "en" },
            achievements: { completed: { first: true } },
          },
        }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
    );
    expect(complete.status).toBe(200);
    const body = (await complete.json()) as {
      uploads: {
        deckIdMap: Record<string, string>;
        decks: { data: Deck; revision: string }[];
        campaigns: { data: Campaign; revision: string }[];
        folders: { state: { deckFolders: Record<string, string> } };
      };
    };

    const remappedDeckId = body.uploads.deckIdMap["deck-a"];
    expect(remappedDeckId).toBeDefined();
    expect(remappedDeckId).not.toBe("deck-a");
    expect(body.uploads.decks).toHaveLength(2);
    expect(body.uploads.campaigns[0]?.data.deck_ids).toContain(remappedDeckId);
    expect(body.uploads.folders.state.deckFolders[remappedDeckId ?? ""]).toBe(
      "folder",
    );

    await expect(
      ctx.db.selectFrom("account_achievements").selectAll().execute(),
    ).resolves.toHaveLength(1);
  });

  it("validates complete-profile blob sizes while allowing larger onboarding bodies", async () => {
    const oversizedBlobCookie = await signupVerifyLogin("blobsize@example.com");
    const oversizedBlob = await ctx.app.request(
      "/v2/account/auth/complete-profile",
      {
        method: "POST",
        body: JSON.stringify({
          username: "blobsize",
          uploads: {
            settings: { value: "x".repeat(70_000) },
          },
        }),
        headers: {
          Cookie: oversizedBlobCookie,
          "Content-Type": "application/json",
        },
      },
    );
    expect(oversizedBlob.status).toBe(400);

    const largeBodyCookie = await signupVerifyLogin("largebody@example.com");
    const largeBody = await ctx.app.request(
      "/v2/account/auth/complete-profile",
      {
        method: "POST",
        body: JSON.stringify({
          username: "largebody",
          uploads: {
            decks: Array.from({ length: 80 }, (_, index) => ({
              ...makeDeck(`large-${index}`),
              description_md: "x".repeat(8_000),
            })),
          },
        }),
        headers: {
          Cookie: largeBodyCookie,
          "Content-Type": "application/json",
        },
      },
    );
    expect(largeBody.status).toBe(200);
  });

  it("enforces session auth failures", async () => {
    const noCookie = await ctx.app.request("/v2/account/profile", {
      method: "PATCH",
      body: JSON.stringify({ username: "renamed" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(noCookie.status).toBe(401);

    const garbage = await ctx.app.request("/v2/account/profile", {
      method: "PATCH",
      body: JSON.stringify({ username: "renamed" }),
      headers: {
        Cookie: `${ctx.config.SESSION_COOKIE_NAME}=garbage`,
        "Content-Type": "application/json",
      },
    });
    expect(garbage.status).toBe(401);

    const { account } = await createVerifiedAccount("expired@example.com");
    const session = await createSession(ctx.db, account.id, 1);
    await ctx.db
      .updateTable("session")
      .set({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .where("id", "=", session.id)
      .execute();

    const expired = await ctx.app.request("/v2/account/auth/me", {
      headers: { Cookie: `${ctx.config.SESSION_COOKIE_NAME}=${session.token}` },
    });
    expect(expired.status).toBe(401);

    const incompleteCookie = await signupVerifyLogin("incomplete@example.com");
    const incomplete = await ctx.app.request("/v2/account/profile", {
      method: "PATCH",
      body: JSON.stringify({ username: "renamed" }),
      headers: { Cookie: incompleteCookie, "Content-Type": "application/json" },
    });
    expect(incomplete.status).toBe(403);
  });

  it("resets passwords and invalidates sessions", async () => {
    const cookie = await signupVerifyLogin("reset@example.com");

    const forgot = await ctx.app.request("/v2/account/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ emailOrUsername: "reset@example.com" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(forgot.status).toBe(200);
    const token = extractToken(ctx.mailer.mails.at(-1)?.body);

    const reset = await ctx.app.request("/v2/account/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password: "newpassword123" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(reset.status).toBe(200);

    const replay = await ctx.app.request("/v2/account/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password: "newpassword123" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(replay.status).toBe(400);

    expect((await loginAccount("reset@example.com")).status).toBe(401);
    expect(
      (await loginAccount("reset@example.com", "newpassword123")).status,
    ).toBe(200);

    const oldSession = await ctx.app.request("/v2/account/auth/me", {
      headers: { Cookie: cookie },
    });
    expect(oldSession.status).toBe(401);
  });

  it("changes credentials, verifies pending email, and frees the old email", async () => {
    const cookie = await completeSignup("credentials@example.com", "creds");

    const wrongPassword = await ctx.app.request(
      "/v2/account/auth/credentials",
      {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: "wrong",
          newPassword: "newpassword123",
        }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
    );
    expect(wrongPassword.status).toBe(400);

    const credentials = await ctx.app.request("/v2/account/auth/credentials", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "password123",
        newEmail: "changed@example.com",
        newPassword: "newpassword123",
      }),
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });
    expect(credentials.status).toBe(200);

    const token = extractToken(ctx.mailer.mails.at(-1)?.body);
    const verify = await ctx.app.request("/v2/account/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
      headers: { "Content-Type": "application/json" },
    });
    expect(verify.status).toBe(200);
    expect(
      (await loginAccount("changed@example.com", "newpassword123")).status,
    ).toBe(200);

    const oldEmailSignup = await signupAccount("credentials@example.com");
    expect(oldEmailSignup.status).toBe(201);
  });

  it("deletes account-owned rows through foreign-key cascades", async () => {
    const cookie = await completeSignupWithUploads(
      "delete@example.com",
      "delete_me",
    );

    const credentials = await ctx.app.request("/v2/account/auth/credentials", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "password123",
        newEmail: "delete_pending@example.com",
      }),
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });
    expect(credentials.status).toBe(200);

    const deleted = await ctx.app.request("/v2/account/auth", {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(deleted.status).toBe(204);

    const me = await ctx.app.request("/v2/account/auth/me", {
      headers: { Cookie: cookie },
    });
    expect(me.status).toBe(401);

    for (const table of [
      "account",
      "account_identity",
      "session",
      "verification_token",
      "account_deck",
      "account_campaign",
      "account_folder",
      "account_settings",
      "account_achievements",
    ] as const) {
      await expect(
        ctx.db.selectFrom(table).selectAll().execute(),
      ).resolves.toHaveLength(0);
    }
  });

  it("isolates account deletion from another account's data", async () => {
    const other = await createVerifiedAccount("other@example.com", "other");
    await ctx.db
      .insertInto("account_deck")
      .values({
        id: "other-deck",
        account_id: other.account.id,
        revision: randomUUID(),
        data: JSON.stringify(makeDeck("other-deck")),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    const cookie = await completeSignupWithUploads(
      "isolated@example.com",
      "isolated",
    );
    const deleted = await ctx.app.request("/v2/account/auth", {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(deleted.status).toBe(204);

    await expect(
      ctx.db
        .selectFrom("account")
        .selectAll()
        .where("id", "=", other.account.id)
        .execute(),
    ).resolves.toHaveLength(1);
    await expect(
      ctx.db
        .selectFrom("account_deck")
        .selectAll()
        .where("account_id", "=", other.account.id)
        .execute(),
    ).resolves.toHaveLength(1);
  });
});

async function signupAccount(email: string) {
  return await ctx.app.request("/v2/account/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password: "password123" }),
    headers: { "Content-Type": "application/json" },
  });
}

async function loginAccount(email: string, password = "password123") {
  return await ctx.app.request("/v2/account/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    headers: { "Content-Type": "application/json" },
  });
}

async function signupVerifyLogin(email: string) {
  await signupAccount(email);
  const token = extractToken(ctx.mailer.mails.at(-1)?.body);
  await ctx.app.request("/v2/account/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
    headers: { "Content-Type": "application/json" },
  });
  const login = await loginAccount(email);
  return getCookie(login);
}

async function completeSignup(email: string, username: string) {
  const cookie = await signupVerifyLogin(email);
  const res = await ctx.app.request("/v2/account/auth/complete-profile", {
    method: "POST",
    body: JSON.stringify({ username }),
    headers: { Cookie: cookie, "Content-Type": "application/json" },
  });
  expect(res.status).toBe(200);
  return cookie;
}

async function completeSignupWithUploads(email: string, username: string) {
  const cookie = await signupVerifyLogin(email);
  const res = await ctx.app.request("/v2/account/auth/complete-profile", {
    method: "POST",
    body: JSON.stringify({
      username,
      uploads: {
        decks: [makeDeck(`${username}-deck`)],
        campaigns: [makeCampaign(`${username}-campaign`, [`${username}-deck`])],
        folders: {
          folders: {
            folder: { id: "folder", name: "Folder" },
          },
          deckFolders: {
            [`${username}-deck`]: "folder",
          },
        },
        settings: { locale: "en" },
        achievements: { completed: { first: true } },
      },
    }),
    headers: { Cookie: cookie, "Content-Type": "application/json" },
  });
  expect(res.status).toBe(200);
  return cookie;
}

async function createVerifiedAccount(
  email: string,
  name = `user_${randomUUID()}`,
) {
  const result = await createAccount(ctx.db, {
    name,
    email,
    passwordHash: await hashPassword("password123"),
    profileCompletedAt: new Date().toISOString(),
  });
  await updateAccountIdentityVerified(ctx.db, result.accountIdentity.id);
  return result;
}

function extractToken(body: string | undefined) {
  const token = body?.match(/[a-f0-9]{64}/)?.[0];
  assertToken(token);
  return token;
}

function assertToken(token: string | undefined): asserts token is string {
  expect(token).toBeDefined();
}

function getCookie(response: Response) {
  const cookie = response.headers.get("set-cookie");
  expect(cookie).toBeTruthy();
  return cookie ?? "";
}

function makeDeck(id: string): Deck {
  return {
    id,
    date_creation: "2026-01-01T00:00:00.000Z",
    date_update: "2026-01-01T00:00:00.000Z",
    description_md: "",
    meta: "{}",
    name: `Deck ${id}`,
    problem: null,
    slots: {},
    rewards: null,
    displaced: null,
    maladies: null,
    source: undefined,
    tags: "",
    user_id: null,
    aspect_code: "awareness",
    role_code: "01001",
    background: "forager",
    specialty: "artist",
  };
}

function makeCampaign(id: string, deckIds: string[]): Campaign {
  return {
    id,
    name: `Campaign ${id}`,
    date_creation: "2026-01-01T00:00:00.000Z",
    date_update: "2026-01-01T00:00:00.000Z",
    cycle_id: "core",
    expansions: [],
    extended_calendar: false,
    day: 1,
    start_location: null,
    current_location: null,
    current_path_terrain: null,
    history: [],
    missions: [],
    calendar: [],
    events: [],
    notes: [],
    rewards: [],
    removed: [],
    deck_ids: deckIds,
    previous_campaign_id: null,
    next_campaign_id: null,
  };
}
