import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appFactory } from "../app.ts";
import { applySqlFiles } from "../db/db.helpers.ts";
import { type Database, getDatabase } from "../db/db.ts";
import { getSharedDeck } from "../db/queries/sharing.ts";
import { type Config, configFromEnv } from "../lib/config.ts";
import { CaptureMailer } from "../lib/email/mailer.ts";
import { createVerifiedAccount, makeDeck } from "./test-utils.ts";

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

describe("sharing and decklists integration", () => {
  it("allows anonymous sharing with null account_id", async () => {
    const deckId = randomUUID();
    const deck = makeDeck(deckId);

    const shareRes = await ctx.app.request("/v2/public/share", {
      method: "POST",
      body: JSON.stringify({ ...deck, history: [] }),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "client-anon",
      },
    });
    expect(shareRes.status).toBe(200);

    const record = await getSharedDeck(ctx.db, deckId);
    expect(record).toBeDefined();
    expect(record?.account_id).toBeNull();
    expect(record?.client_id).toBe("client-anon");
    expect(record?.listed).toBe(0);
  });

  it("associates sharing with account_id when user is authenticated", async () => {
    const user = await createVerifiedAccount(
      ctx.db,
      ctx.config,
      "user@example.com",
      "user_completed",
    );
    const cookie = user.cookie;

    const deckId = randomUUID();
    const deck = makeDeck(deckId);

    const shareRes = await ctx.app.request("/v2/public/share", {
      method: "POST",
      body: JSON.stringify({ ...deck, history: [] }),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "client-device-1",
        Cookie: cookie,
      },
    });
    expect(shareRes.status).toBe(200);

    const record = await getSharedDeck(ctx.db, deckId);
    expect(record).toBeDefined();
    expect(record?.account_id).toBe(user.account.id);
    expect(record?.client_id).toBe("client-device-1");
  });

  it("returns 409 when creating a duplicate share", async () => {
    const deckId = randomUUID();
    const deck = makeDeck(deckId);

    const firstRes = await ctx.app.request("/v2/public/share", {
      method: "POST",
      body: JSON.stringify({ ...deck, history: [] }),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "client-duplicate",
      },
    });
    expect(firstRes.status).toBe(200);

    const secondRes = await ctx.app.request("/v2/public/share", {
      method: "POST",
      body: JSON.stringify({ ...deck, history: [] }),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "client-duplicate",
      },
    });
    expect(secondRes.status).toBe(409);
  });

  it("authorizes updates based on client_id or account_id", async () => {
    const userA = await createVerifiedAccount(
      ctx.db,
      ctx.config,
      "usera@example.com",
      "usera",
    );
    const cookieA = userA.cookie;

    const userB = await createVerifiedAccount(
      ctx.db,
      ctx.config,
      "userb@example.com",
      "userb",
    );
    const cookieB = userB.cookie;

    const deckId = randomUUID();
    const deck = makeDeck(deckId);

    // 1. User A shares deck via device 1
    await ctx.app.request("/v2/public/share", {
      method: "POST",
      body: JSON.stringify({ ...deck, history: [] }),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "device-1",
        Cookie: cookieA,
      },
    });

    // 2. Unauthenticated user with different client ID tries to update -> should not modify data
    const updatedDeck = { ...deck, name: "Stolen Deck" };
    const wrongClientRes = await ctx.app.request(`/v2/public/share/${deckId}`, {
      method: "PUT",
      body: JSON.stringify({ ...updatedDeck, history: [] }),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "device-2",
      },
    });
    expect(wrongClientRes.status).toBe(403);
    let record = await getSharedDeck(ctx.db, deckId);
    expect(JSON.parse(record?.data ?? "{}").name).toBe(`Deck ${deckId}`); // Unchanged

    // 3. Authenticated User B tries to update User A's deck -> should not modify data
    const wrongUserRes = await ctx.app.request(`/v2/public/share/${deckId}`, {
      method: "PUT",
      body: JSON.stringify({ ...updatedDeck, history: [] }),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "device-2",
        Cookie: cookieB,
      },
    });
    expect(wrongUserRes.status).toBe(403);
    record = await getSharedDeck(ctx.db, deckId);
    expect(JSON.parse(record?.data ?? "{}").name).toBe(`Deck ${deckId}`); // Unchanged

    // 4. Authenticated User A updates from device 2 -> should succeed
    const legitUpdate = { ...deck, name: "Legit Updated Deck" };
    const updateRes = await ctx.app.request(`/v2/public/share/${deckId}`, {
      method: "PUT",
      body: JSON.stringify({ ...legitUpdate, history: [] }),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "device-2",
        Cookie: cookieA,
      },
    });
    expect(updateRes.status).toBe(200);
    record = await getSharedDeck(ctx.db, deckId);
    expect(JSON.parse(record?.data ?? "{}").name).toBe("Legit Updated Deck");
  });

  it("returns 404 when updating a missing share", async () => {
    const deckId = randomUUID();
    const deck = makeDeck(deckId);

    const updateRes = await ctx.app.request(`/v2/public/share/${deckId}`, {
      method: "PUT",
      body: JSON.stringify({ ...deck, history: [] }),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "device-1",
      },
    });

    expect(updateRes.status).toBe(404);
  });

  it("authorizes deletion based on client_id or account_id", async () => {
    const userA = await createVerifiedAccount(
      ctx.db,
      ctx.config,
      "usera@example.com",
      "usera",
    );
    const cookieA = userA.cookie;

    const userB = await createVerifiedAccount(
      ctx.db,
      ctx.config,
      "userb@example.com",
      "userb",
    );
    const cookieB = userB.cookie;

    const deckId = randomUUID();
    const deck = makeDeck(deckId);

    // 1. User A shares deck via device 1
    await ctx.app.request("/v2/public/share", {
      method: "POST",
      body: JSON.stringify({ ...deck, history: [] }),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "device-1",
        Cookie: cookieA,
      },
    });

    // 2. Unauthenticated user with different client ID tries to delete -> should not delete
    const wrongClientRes = await ctx.app.request(`/v2/public/share/${deckId}`, {
      method: "DELETE",
      headers: {
        "X-Client-Id": "device-2",
      },
    });
    expect(wrongClientRes.status).toBe(403);
    let record = await getSharedDeck(ctx.db, deckId);
    expect(record).toBeDefined();

    // 3. User B tries to delete User A's deck -> should not delete
    const wrongUserRes = await ctx.app.request(`/v2/public/share/${deckId}`, {
      method: "DELETE",
      headers: {
        "X-Client-Id": "device-2",
        Cookie: cookieB,
      },
    });
    expect(wrongUserRes.status).toBe(403);
    record = await getSharedDeck(ctx.db, deckId);
    expect(record).toBeDefined();

    // 4. User A deletes from device 2 -> should succeed
    const deleteRes = await ctx.app.request(`/v2/public/share/${deckId}`, {
      method: "DELETE",
      headers: {
        "X-Client-Id": "device-2",
        Cookie: cookieA,
      },
    });
    expect(deleteRes.status).toBe(200);
    record = await getSharedDeck(ctx.db, deckId);
    expect(record).toBeUndefined();
  });

  it("exposes author_name in decklist search only for completed profiles", async () => {
    // 1. Create a user with a completed profile
    const completedUser = await createVerifiedAccount(
      ctx.db,
      ctx.config,
      "completed@example.com",
      "completed_user",
    );
    const completedCookie = completedUser.cookie;

    // 2. Create a user with an incomplete profile
    const incompleteUser = await createVerifiedAccount(
      ctx.db,
      ctx.config,
      "incomplete@example.com",
      "incomplete_user",
    );
    // Force it to be incomplete
    await ctx.db
      .updateTable("account")
      .set({ profile_completed_at: null })
      .where("id", "=", incompleteUser.account.id)
      .execute();
    const incompleteCookie = incompleteUser.cookie;

    const deck1Id = randomUUID();
    const deck2Id = randomUUID();
    const deck3Id = randomUUID();

    // Completed profile share
    await ctx.app.request("/v2/public/share", {
      method: "POST",
      body: JSON.stringify({ ...makeDeck(deck1Id), history: [], listed: true }),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "device-1",
        Cookie: completedCookie,
      },
    });

    // Incomplete profile share
    await ctx.app.request("/v2/public/share", {
      method: "POST",
      body: JSON.stringify({ ...makeDeck(deck2Id), history: [], listed: true }),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "device-1",
        Cookie: incompleteCookie,
      },
    });

    // Anonymous share
    await ctx.app.request("/v2/public/share", {
      method: "POST",
      body: JSON.stringify({ ...makeDeck(deck3Id), history: [], listed: true }),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "device-anon",
      },
    });

    // Search decklists
    const searchRes = await ctx.app.request("/v2/public/decklists");
    expect(searchRes.status).toBe(200);
    const searchBody = (await searchRes.json()) as {
      meta: { total: number };
      data: Array<{ id: string; author_name: string | null }>;
    };
    expect(searchBody.meta.total).toBe(3);

    const results = searchBody.data;

    // Verify deck1 (completed profile) has author name
    const d1 = results.find((r) => r.id === deck1Id);
    expect(d1).toBeDefined();
    expect(d1?.author_name).toBe("completed_user");

    // Verify deck2 (incomplete profile) has null author name
    const d2 = results.find((r) => r.id === deck2Id);
    expect(d2).toBeDefined();
    expect(d2?.author_name).toBeNull();

    // Verify deck3 (anonymous) has null author name
    const d3 = results.find((r) => r.id === deck3Id);
    expect(d3).toBeDefined();
    expect(d3?.author_name).toBeNull();

    const shareRes = await ctx.app.request(
      `/v2/public/share/history/${deck1Id}`,
    );
    expect(shareRes.status).toBe(200);
    const shareBody = (await shareRes.json()) as {
      author_name: string | null;
      listed: boolean;
    };
    expect(shareBody.author_name).toBe("completed_user");
    expect(shareBody.listed).toBe(true);
  });

  it("keeps unlisted shares out of decklists while preserving link access", async () => {
    const deckId = randomUUID();
    const deck = makeDeck(deckId);

    const shareRes = await ctx.app.request("/v2/public/share", {
      method: "POST",
      body: JSON.stringify({ ...deck, history: [] }),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "client-unlisted",
      },
    });
    expect(shareRes.status).toBe(200);

    const searchRes = await ctx.app.request("/v2/public/decklists");
    expect(searchRes.status).toBe(200);
    const searchBody = (await searchRes.json()) as {
      meta: { total: number };
      data: Array<{ id: string }>;
    };
    expect(searchBody.meta.total).toBe(0);
    expect(searchBody.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: deckId })]),
    );

    const historyRes = await ctx.app.request(
      `/v2/public/share/history/${deckId}`,
    );
    expect(historyRes.status).toBe(200);
    const historyBody = (await historyRes.json()) as { listed: boolean };
    expect(historyBody.listed).toBe(false);
  });

  it("lists shares only when requested and supports unlisting by update", async () => {
    const deckId = randomUUID();
    const deck = makeDeck(deckId);

    const shareRes = await ctx.app.request("/v2/public/share", {
      method: "POST",
      body: JSON.stringify({ ...deck, history: [], listed: true }),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "client-listed",
      },
    });
    expect(shareRes.status).toBe(200);

    const listedSearchRes = await ctx.app.request("/v2/public/decklists");
    expect(listedSearchRes.status).toBe(200);
    const listedSearchBody = (await listedSearchRes.json()) as {
      meta: { total: number };
      data: Array<{ id: string }>;
    };
    expect(listedSearchBody.meta.total).toBe(1);
    expect(listedSearchBody.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: deckId })]),
    );

    const updateRes = await ctx.app.request(`/v2/public/share/${deckId}`, {
      method: "PUT",
      body: JSON.stringify({ ...deck, history: [], listed: false }),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "client-listed",
      },
    });
    expect(updateRes.status).toBe(200);

    const unlistedSearchRes = await ctx.app.request("/v2/public/decklists");
    expect(unlistedSearchRes.status).toBe(200);
    const unlistedSearchBody = (await unlistedSearchRes.json()) as {
      meta: { total: number };
      data: Array<{ id: string }>;
    };
    expect(unlistedSearchBody.meta.total).toBe(0);
    expect(unlistedSearchBody.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: deckId })]),
    );
  });

  it("rejects malformed required and excluded decklist search filters", async () => {
    const requiredRes = await ctx.app.request(
      "/v2/public/decklists?required=a%20b",
    );
    expect(requiredRes.status).toBe(400);

    const excludedRes = await ctx.app.request(
      "/v2/public/decklists?excluded='%3B--",
    );
    expect(excludedRes.status).toBe(400);
  });

  it("searches decklists by required card code", async () => {
    const deckId = randomUUID();

    const shareRes = await ctx.app.request("/v2/public/share", {
      method: "POST",
      body: JSON.stringify({
        ...makeDeck(deckId),
        history: [],
        listed: true,
        slots: { "01100": 1 },
      }),
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "client-card-search",
      },
    });
    expect(shareRes.status).toBe(200);

    const searchRes = await ctx.app.request(
      "/v2/public/decklists?required=01100",
    );
    expect(searchRes.status).toBe(200);

    const searchBody = (await searchRes.json()) as {
      meta: { total: number };
      data: Array<{ id: string }>;
    };
    expect(searchBody.meta.total).toBe(1);
    expect(searchBody.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: deckId })]),
    );
  });

  it("treats percent signs as literal text in decklist name search", async () => {
    const percentDeckId = randomUUID();
    const wordDeckId = randomUUID();

    for (const deck of [
      { ...makeDeck(percentDeckId), name: "100% Legit" },
      { ...makeDeck(wordDeckId), name: "100 Percent" },
    ]) {
      const shareRes = await ctx.app.request("/v2/public/share", {
        method: "POST",
        body: JSON.stringify({ ...deck, history: [], listed: true }),
        headers: {
          "Content-Type": "application/json",
          "X-Client-Id": `client-${deck.id}`,
        },
      });
      expect(shareRes.status).toBe(200);
    }

    const searchRes = await ctx.app.request("/v2/public/decklists?name=100%25");
    expect(searchRes.status).toBe(200);
    const searchBody = (await searchRes.json()) as {
      data: Array<{ id: string }>;
      meta: { total: number };
    };

    expect(searchBody.meta.total).toBe(1);
    expect(searchBody.data).toEqual([
      expect.objectContaining({ id: percentDeckId }),
    ]);
  });

  it("serves share routes with credentialed CORS", async () => {
    const origin = "http://localhost:3000";

    const preflight = await ctx.app.request("/v2/public/share", {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type,X-Client-Id",
      },
    });

    expect(preflight.headers.get("access-control-allow-origin")).toBe(origin);
    expect(preflight.headers.get("access-control-allow-credentials")).toBe(
      "true",
    );
  });

  it("allows wildcard CORS only for HTTPS origins", async () => {
    const wildcardApp = appFactory(
      { ...ctx.config, CORS_ORIGINS: "*.example.com" },
      ctx.db,
      ctx.mailer,
    );

    const httpsPreflight = await wildcardApp.request("/v2/public/share", {
      method: "OPTIONS",
      headers: {
        Origin: "https://decks.example.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type,X-Client-Id",
      },
    });
    expect(httpsPreflight.headers.get("access-control-allow-origin")).toBe(
      "https://decks.example.com",
    );

    const httpPreflight = await wildcardApp.request("/v2/public/share", {
      method: "OPTIONS",
      headers: {
        Origin: "http://decks.example.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type,X-Client-Id",
      },
    });
    expect(httpPreflight.headers.get("access-control-allow-origin")).toBeNull();
  });
});
