import { randomUUID } from "node:crypto";
import type { Campaign } from "@earthborne-build/shared";
import { describe, expect } from "vitest";
import { createAccount } from "../db/queries/auth/accounts.ts";
import { updateAccountIdentityVerified } from "../db/queries/auth/identities.ts";
import { hashPassword } from "../lib/auth/crypto.ts";
import { createSession } from "../lib/auth/sessions.ts";
import { test } from "./test-utils.ts";

describe("POST /v2/account/campaigns", () => {
  test("returns 401 when unauthenticated", async ({ dependencies }) => {
    const res = await dependencies.app.request("/v2/account/campaigns", {
      method: "POST",
      body: JSON.stringify({ data: makeCampaign("camp-1") }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(401);
  });

  test("creates a campaign and returns its revision", async ({
    dependencies,
  }) => {
    const { cookie } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "camp@example.com",
    );

    const campaign = makeCampaign("my-camp");
    const res = await dependencies.app.request("/v2/account/campaigns", {
      method: "POST",
      body: JSON.stringify({ data: campaign }),
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { revision: string };
    expect(body.revision).toBeDefined();

    const row = await dependencies.db
      .selectFrom("account_campaign")
      .selectAll()
      .executeTakeFirstOrThrow();
    expect(JSON.parse(row.data).name).toBe("Campaign my-camp");
  });

  test("returns 409 when creating a campaign with a duplicate id", async ({
    dependencies,
  }) => {
    const { cookie, account } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "dup-camp@example.com",
    );

    await dependencies.db
      .insertInto("account_campaign")
      .values({
        id: "dup-camp",
        account_id: account.id,
        revision: randomUUID(),
        data: JSON.stringify(makeCampaign("dup-camp")),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    const res = await dependencies.app.request("/v2/account/campaigns", {
      method: "POST",
      body: JSON.stringify({ data: makeCampaign("dup-camp") }),
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });
    expect(res.status).toBe(409);
  });
});

describe("POST /v2/account/campaigns/batch", () => {
  test("fetches multiple campaigns by id", async ({ dependencies }) => {
    const { cookie, account } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "batch-camp@example.com",
    );

    const camp1 = makeCampaign("batch-camp-1");
    const camp2 = makeCampaign("batch-camp-2");
    await dependencies.db
      .insertInto("account_campaign")
      .values([
        {
          id: "batch-camp-1",
          account_id: account.id,
          revision: randomUUID(),
          data: JSON.stringify(camp1),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "batch-camp-2",
          account_id: account.id,
          revision: randomUUID(),
          data: JSON.stringify(camp2),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .execute();

    const res = await dependencies.app.request("/v2/account/campaigns/batch", {
      method: "POST",
      body: JSON.stringify({ ids: ["batch-camp-1", "batch-camp-2"] }),
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      campaigns: { data: { name: string } }[];
    };
    expect(body.campaigns).toHaveLength(2);
  });
});

describe("PUT /v2/account/campaigns/:id", () => {
  test("updates an existing campaign", async ({ dependencies }) => {
    const { cookie, account } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "update-camp@example.com",
    );

    const revision = randomUUID();
    await dependencies.db
      .insertInto("account_campaign")
      .values({
        id: "update-camp",
        account_id: account.id,
        revision,
        data: JSON.stringify(makeCampaign("update-camp")),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    const updatedCampaign = {
      ...makeCampaign("update-camp"),
      name: "Updated Campaign",
    };
    const res = await dependencies.app.request(
      "/v2/account/campaigns/update-camp",
      {
        method: "PUT",
        body: JSON.stringify({
          data: updatedCampaign,
          expectedRevision: revision,
        }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
    );
    expect(res.status).toBe(200);

    const row = await dependencies.db
      .selectFrom("account_campaign")
      .select("data")
      .where("id", "=", "update-camp")
      .executeTakeFirstOrThrow();
    expect(JSON.parse(row.data).name).toBe("Updated Campaign");
  });

  test("returns 400 when campaign id does not match URL", async ({
    dependencies,
  }) => {
    const { cookie } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "mismatch-camp@example.com",
    );

    const res = await dependencies.app.request("/v2/account/campaigns/url-id", {
      method: "PUT",
      body: JSON.stringify({
        data: makeCampaign("different-id"),
        expectedRevision: randomUUID(),
      }),
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  test("returns 404 when campaign does not exist", async ({ dependencies }) => {
    const { cookie } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "missing-camp@example.com",
    );

    const res = await dependencies.app.request(
      "/v2/account/campaigns/missing-camp",
      {
        method: "PUT",
        body: JSON.stringify({
          data: makeCampaign("missing-camp"),
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
      "conflict-camp@example.com",
    );

    await dependencies.db
      .insertInto("account_campaign")
      .values({
        id: "conflict-camp",
        account_id: account.id,
        revision: randomUUID(),
        data: JSON.stringify(makeCampaign("conflict-camp")),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    const res = await dependencies.app.request(
      "/v2/account/campaigns/conflict-camp",
      {
        method: "PUT",
        body: JSON.stringify({
          data: makeCampaign("conflict-camp"),
          expectedRevision: randomUUID(),
        }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
    );
    expect(res.status).toBe(409);
  });
});

describe("DELETE /v2/account/campaigns/:id", () => {
  test("deletes an existing campaign", async ({ dependencies }) => {
    const { cookie, account } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "delete-camp@example.com",
    );

    const revision = randomUUID();
    await dependencies.db
      .insertInto("account_campaign")
      .values({
        id: "delete-camp",
        account_id: account.id,
        revision,
        data: JSON.stringify(makeCampaign("delete-camp")),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    const res = await dependencies.app.request(
      "/v2/account/campaigns/delete-camp",
      {
        method: "DELETE",
        body: JSON.stringify({ expectedRevision: revision }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok" });

    const row = await dependencies.db
      .selectFrom("account_campaign")
      .selectAll()
      .where("id", "=", "delete-camp")
      .executeTakeFirst();
    expect(row).toBeUndefined();
  });

  test("returns 404 when campaign does not exist", async ({ dependencies }) => {
    const { cookie } = await createVerifiedAccount(
      dependencies.db,
      dependencies.config,
      "delete-missing-camp@example.com",
    );

    const res = await dependencies.app.request(
      "/v2/account/campaigns/missing-camp",
      {
        method: "DELETE",
        body: JSON.stringify({ expectedRevision: randomUUID() }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
    );
    expect(res.status).toBe(404);
  });
});

function makeCampaign(id: string): Campaign {
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
    deck_ids: [],
    previous_campaign_id: null,
    next_campaign_id: null,
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
