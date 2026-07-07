import type { Campaign, Deck } from "@earthborne-build/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appFactory } from "../app.ts";
import { applySqlFiles } from "../db/db.helpers.ts";
import { type Database, getDatabase } from "../db/db.ts";
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

describe("account sync routes", () => {
  it("syncs deck manifest, create, batch, update conflict, and delete conflict", async () => {
    const cookie = await createAccountCookie(
      "deck-sync@example.com",
      "decksync",
    );

    await expect(fetchManifest(cookie)).resolves.toMatchObject({
      decks: [],
      campaigns: [],
    });

    const create = await postJson(
      "/v2/account/decks",
      { data: makeDeck("deck-1") },
      cookie,
    );
    expect(create.status).toBe(201);
    const created = (await create.json()) as { revision: string };
    expect(created.revision).toBeTruthy();

    const manifest = await fetchManifest(cookie);
    expect(manifest.decks).toHaveLength(1);
    expect(manifest.decks[0]).toMatchObject({
      id: "deck-1",
      revision: created.revision,
    });

    const batch = await postJson(
      "/v2/account/decks/batch",
      { ids: ["deck-1"] },
      cookie,
    );
    expect(batch.status).toBe(200);
    await expect(batch.json()).resolves.toMatchObject({
      decks: [{ data: { id: "deck-1" }, revision: created.revision }],
    });

    const update = await putJson(
      "/v2/account/decks/deck-1",
      {
        data: { ...makeDeck("deck-1"), name: "Updated" },
        expectedRevision: created.revision,
      },
      cookie,
    );
    expect(update.status).toBe(200);
    const updated = (await update.json()) as { revision: string };
    expect(updated.revision).not.toBe(created.revision);

    const staleUpdate = await putJson(
      "/v2/account/decks/deck-1",
      {
        data: { ...makeDeck("deck-1"), name: "Stale" },
        expectedRevision: created.revision,
      },
      cookie,
    );
    expect(staleUpdate.status).toBe(409);
    await expect(staleUpdate.json()).resolves.toMatchObject({
      cause: {
        data: { name: "Updated" },
        revision: updated.revision,
      },
    });

    const staleDelete = await deleteJson(
      "/v2/account/decks/deck-1",
      { expectedRevision: created.revision },
      cookie,
    );
    expect(staleDelete.status).toBe(409);

    const deleted = await deleteJson(
      "/v2/account/decks/deck-1",
      { expectedRevision: updated.revision },
      cookie,
    );
    expect(deleted.status).toBe(200);

    const secondDelete = await deleteJson(
      "/v2/account/decks/deck-1",
      { expectedRevision: updated.revision },
      cookie,
    );
    expect(secondDelete.status).toBe(404);
  });

  it("rejects duplicate ids owned by any account and hides cross-account batch rows", async () => {
    const cookieA = await createAccountCookie("a@example.com", "account_a");
    const cookieB = await createAccountCookie("b@example.com", "account_b");

    expect(
      (await postJson("/v2/account/decks", { data: makeDeck("same") }, cookieA))
        .status,
    ).toBe(201);
    expect(
      (await postJson("/v2/account/decks", { data: makeDeck("same") }, cookieB))
        .status,
    ).toBe(409);

    const batch = await postJson(
      "/v2/account/decks/batch",
      { ids: ["same"] },
      cookieB,
    );
    expect(batch.status).toBe(200);
    await expect(batch.json()).resolves.toEqual({ decks: [] });
  });

  it("validates deck payloads, batch limits, authorization, and oversized data", async () => {
    const cookie = await createAccountCookie("validation@example.com", "valid");

    const unauthorized = await ctx.app.request("/v2/account/sync/manifest");
    expect(unauthorized.status).toBe(401);

    const invalid = await postJson(
      "/v2/account/decks",
      { data: { id: "invalid" } },
      cookie,
    );
    expect(invalid.status).toBe(400);

    const tooMany = await postJson(
      "/v2/account/decks/batch",
      { ids: Array.from({ length: 251 }, (_, index) => `deck-${index}`) },
      cookie,
    );
    expect(tooMany.status).toBe(400);

    const oversized = await postJson(
      "/v2/account/decks",
      { data: { ...makeDeck("large"), description_md: "x".repeat(2_100_000) } },
      cookie,
    );
    expect(oversized.status).toBeGreaterThanOrEqual(400);
    expect(oversized.status).not.toBe(500);
  });

  it("syncs campaign create, update conflict, and delete", async () => {
    const cookie = await createAccountCookie(
      "campaign@example.com",
      "campaign",
    );

    const create = await postJson(
      "/v2/account/campaigns",
      { data: makeCampaign("campaign-1", []) },
      cookie,
    );
    expect(create.status).toBe(201);
    const created = (await create.json()) as { revision: string };

    const update = await putJson(
      "/v2/account/campaigns/campaign-1",
      {
        data: { ...makeCampaign("campaign-1", []), name: "Updated Campaign" },
        expectedRevision: created.revision,
      },
      cookie,
    );
    expect(update.status).toBe(200);
    const updated = (await update.json()) as { revision: string };

    const conflict = await putJson(
      "/v2/account/campaigns/campaign-1",
      {
        data: makeCampaign("campaign-1", []),
        expectedRevision: created.revision,
      },
      cookie,
    );
    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toMatchObject({
      cause: {
        data: { name: "Updated Campaign" },
        revision: updated.revision,
      },
    });

    const deleted = await deleteJson(
      "/v2/account/campaigns/campaign-1",
      { expectedRevision: updated.revision },
      cookie,
    );
    expect(deleted.status).toBe(200);
  });

  it.each([
    {
      path: "folders",
      first: { state: { folders: {}, deckFolders: {} } },
      second: {
        state: { folders: { f: { id: "f", name: "Folder" } }, deckFolders: {} },
      },
      responseKey: "state",
    },
    {
      path: "settings",
      first: { settings: { locale: "en" } },
      second: { settings: { locale: "de" } },
      responseKey: "settings",
    },
    {
      path: "achievements",
      first: { state: { completed: { first: true } } },
      second: { state: { completed: { first: { date: "2026-01-01" } } } },
      responseKey: "state",
    },
  ])("syncs $path blobs with first-write and stale-revision conflicts", async ({
    path,
    first,
    second,
    responseKey,
  }) => {
    const cookie = await createAccountCookie(`${path}@example.com`, path);

    const missing = await ctx.app.request(`/v2/account/${path}`, {
      headers: { Cookie: cookie },
    });
    expect(missing.status).toBe(404);

    const create = await putJson(
      `/v2/account/${path}`,
      { ...first, expectedRevision: null },
      cookie,
    );
    expect(create.status).toBe(200);
    const created = (await create.json()) as {
      revision: string;
    };
    expect(created.revision).toBeTruthy();

    const duplicateFirst = await putJson(
      `/v2/account/${path}`,
      { ...first, expectedRevision: null },
      cookie,
    );
    expect(duplicateFirst.status).toBe(409);

    const update = await putJson(
      `/v2/account/${path}`,
      { ...second, expectedRevision: created.revision },
      cookie,
    );
    expect(update.status).toBe(200);
    const updated = (await update.json()) as { revision: string };
    expect(updated.revision).not.toBe(created.revision);

    const stale = await putJson(
      `/v2/account/${path}`,
      { ...first, expectedRevision: created.revision },
      cookie,
    );
    expect(stale.status).toBe(409);
    const staleBody = (await stale.json()) as {
      cause: Record<string, unknown>;
    };
    expect(staleBody.cause["revision"]).toBe(updated.revision);
    expect(staleBody.cause[responseKey]).toBeDefined();
  });
});

async function createAccountCookie(email: string, username: string) {
  await postJson("/v2/account/auth/signup", { email, password: "password123" });
  const token = extractToken(ctx.mailer.mails.at(-1)?.body);
  await postJson("/v2/account/auth/verify-email", { token });
  const login = await postJson("/v2/account/auth/login", {
    email,
    password: "password123",
  });
  const cookie = getCookie(login);
  const complete = await postJson(
    "/v2/account/auth/complete-profile",
    { username },
    cookie,
  );
  expect(complete.status).toBe(200);
  return cookie;
}

async function fetchManifest(cookie: string) {
  const response = await ctx.app.request("/v2/account/sync/manifest", {
    headers: { Cookie: cookie },
  });
  expect(response.status).toBe(200);
  return (await response.json()) as {
    decks: { id: string; revision: string; updatedAt: string }[];
    campaigns: { id: string; revision: string; updatedAt: string }[];
  };
}

async function postJson(path: string, body: unknown, cookie?: string) {
  return await ctx.app.request(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers: jsonHeaders(cookie),
  });
}

async function putJson(path: string, body: unknown, cookie?: string) {
  return await ctx.app.request(path, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: jsonHeaders(cookie),
  });
}

async function deleteJson(path: string, body: unknown, cookie?: string) {
  return await ctx.app.request(path, {
    method: "DELETE",
    body: JSON.stringify(body),
    headers: jsonHeaders(cookie),
  });
}

function jsonHeaders(cookie?: string) {
  return {
    ...(cookie ? { Cookie: cookie } : {}),
    "Content-Type": "application/json",
  };
}

function extractToken(body: string | undefined) {
  const token = body?.match(/[a-f0-9]{64}/)?.[0];
  expect(token).toBeDefined();
  return token ?? "";
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
