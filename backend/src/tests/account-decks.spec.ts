import { randomUUID } from "node:crypto";
import type { Deck } from "@earthborne-build/shared";
import { describe, expect } from "vitest";
import { createAccount } from "../db/queries/auth/accounts.ts";
import { updateAccountIdentityVerified } from "../db/queries/auth/identities.ts";
import { hashPassword } from "../lib/auth/crypto.ts";
import { createSession } from "../lib/auth/sessions.ts";
import { test } from "./test-utils.ts";

describe("POST /v2/account/decks", () => {
  test("returns 401 when unauthenticated", async ({ dependencies }) => {
    const res = await dependencies.app.request("/v2/account/decks", {
      method: "POST",
      body: JSON.stringify({ data: makeDeck("deck-1") }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(401);
  });

  test("creates a deck and returns its revision", async ({ dependencies }) => {
    const { cookie } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "test@example.com",
    );

    const deck = makeDeck("my-deck");
    const res = await dependencies.app.request("/v2/account/decks", {
      method: "POST",
      body: JSON.stringify({ data: deck }),
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { revision: string };
    expect(body.revision).toBeDefined();
    expect(body.revision).toHaveLength(36); // UUID

    // Verify the deck exists in the database.
    const row = await dependencies.db
      .selectFrom("account_deck")
      .selectAll()
      .where("id", "=", "my-deck")
      .executeTakeFirstOrThrow();
    expect(JSON.parse(row.data).name).toBe("Deck my-deck");
  });

  test("returns 409 when creating a deck with a duplicate id", async ({
    dependencies,
  }) => {
    const { cookie, account } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "dup@example.com",
    );

    // Insert a deck directly.
    await dependencies.db
      .insertInto("account_deck")
      .values({
        id: "dup-deck",
        account_id: account.id,
        revision: randomUUID(),
        data: JSON.stringify(makeDeck("dup-deck")),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    const res = await dependencies.app.request("/v2/account/decks", {
      method: "POST",
      body: JSON.stringify({ data: makeDeck("dup-deck") }),
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });
    expect(res.status).toBe(409);
  });
});

describe("POST /v2/account/decks/batch", () => {
  test("fetches multiple decks by id", async ({ dependencies }) => {
    const { cookie, account } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "batch@example.com",
    );

    // Insert two decks.
    const deck1 = makeDeck("batch-1");
    const deck2 = makeDeck("batch-2");
    await dependencies.db
      .insertInto("account_deck")
      .values([
        {
          id: "batch-1",
          account_id: account.id,
          revision: randomUUID(),
          data: JSON.stringify(deck1),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "batch-2",
          account_id: account.id,
          revision: randomUUID(),
          data: JSON.stringify(deck2),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .execute();

    const res = await dependencies.app.request("/v2/account/decks/batch", {
      method: "POST",
      body: JSON.stringify({ ids: ["batch-1", "batch-2", "missing"] }),
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      decks: { data: { name: string }; revision: string }[];
    };
    expect(body.decks).toHaveLength(2);
    const names = body.decks.map((d) => d.data.name).sort();
    expect(names).toEqual(["Deck batch-1", "Deck batch-2"]);
  });
});

describe("PUT /v2/account/decks/:id", () => {
  test("updates an existing deck", async ({ dependencies }) => {
    const { cookie, account } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "update@example.com",
    );

    const revision = randomUUID();
    await dependencies.db
      .insertInto("account_deck")
      .values({
        id: "update-deck",
        account_id: account.id,
        revision,
        data: JSON.stringify(makeDeck("update-deck")),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    const updatedDeck = { ...makeDeck("update-deck"), name: "Updated Deck" };
    const res = await dependencies.app.request(
      "/v2/account/decks/update-deck",
      {
        method: "PUT",
        body: JSON.stringify({ data: updatedDeck, expectedRevision: revision }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { revision: string };
    expect(body.revision).toBeDefined();
    expect(body.revision).not.toBe(revision);

    // Verify the data was updated.
    const row = await dependencies.db
      .selectFrom("account_deck")
      .select("data")
      .where("id", "=", "update-deck")
      .executeTakeFirstOrThrow();
    expect(JSON.parse(row.data).name).toBe("Updated Deck");
  });

  test("returns 400 when deck id does not match URL", async ({
    dependencies,
  }) => {
    const { cookie } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "mismatch@example.com",
    );

    const res = await dependencies.app.request("/v2/account/decks/url-id", {
      method: "PUT",
      body: JSON.stringify({
        data: makeDeck("different-id"),
        expectedRevision: randomUUID(),
      }),
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  test("returns 404 when deck does not exist", async ({ dependencies }) => {
    const { cookie } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "missing@example.com",
    );

    const deck = makeDeck("missing-deck");
    const res = await dependencies.app.request(
      "/v2/account/decks/missing-deck",
      {
        method: "PUT",
        body: JSON.stringify({
          data: deck,
          expectedRevision: randomUUID(),
        }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
    );
    expect(res.status).toBe(404);
  });

  test("returns 409 on revision conflict", async ({ dependencies }) => {
    const { cookie, account } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "conflict@example.com",
    );

    await dependencies.db
      .insertInto("account_deck")
      .values({
        id: "conflict-deck",
        account_id: account.id,
        revision: randomUUID(),
        data: JSON.stringify(makeDeck("conflict-deck")),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    const deck = makeDeck("conflict-deck");
    const res = await dependencies.app.request(
      "/v2/account/decks/conflict-deck",
      {
        method: "PUT",
        body: JSON.stringify({
          data: deck,
          expectedRevision: randomUUID(), // Wrong revision.
        }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
    );
    expect(res.status).toBe(409);
  });
});

describe("DELETE /v2/account/decks/:id", () => {
  test("deletes an existing deck", async ({ dependencies }) => {
    const { cookie, account } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "delete@example.com",
    );

    const revision = randomUUID();
    await dependencies.db
      .insertInto("account_deck")
      .values({
        id: "delete-deck",
        account_id: account.id,
        revision,
        data: JSON.stringify(makeDeck("delete-deck")),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    const res = await dependencies.app.request(
      "/v2/account/decks/delete-deck",
      {
        method: "DELETE",
        body: JSON.stringify({ expectedRevision: revision }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("ok");

    // Verify the deck is gone.
    const row = await dependencies.db
      .selectFrom("account_deck")
      .selectAll()
      .where("id", "=", "delete-deck")
      .executeTakeFirst();
    expect(row).toBeUndefined();
  });

  test("returns 404 when deck does not exist", async ({ dependencies }) => {
    const { cookie } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "delete-missing@example.com",
    );

    const res = await dependencies.app.request(
      "/v2/account/decks/missing-deck",
      {
        method: "DELETE",
        body: JSON.stringify({ expectedRevision: randomUUID() }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
    );
    expect(res.status).toBe(404);
  });
});

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
