import { randomUUID } from "node:crypto";
import {
  type Campaign,
  CampaignBatchResponseSchema,
  type Deck,
  PublicCampaignSchema,
} from "@earthborne-build/shared";
import { describe, expect } from "vitest";
import type { Database } from "../db/db.ts";
import {
  createVerifiedAccount,
  makeCampaign,
  makeDeck,
  test,
} from "./test-utils.ts";

describe("GET /v2/public/campaign/:id", () => {
  test("returns a shared campaign and its linked decks", async ({
    dependencies,
  }) => {
    const { db, app } = dependencies;
    const { account } = await createVerifiedAccount(
      db,
      dependencies.config,
      "share@example.com",
    );

    await seedDeck(db, account.id, makeDeck("deck-1"));
    await seedDeck(db, account.id, makeDeck("deck-2"));
    await seedCampaign(db, account.id, makeCampaign("camp-1", ["deck-1"]), 1);

    const res = await app.request("/v2/public/campaign/camp-1");
    expect(res.status).toBe(200);

    const body = PublicCampaignSchema.parse(await res.json());
    expect(body.schema_version).toBe(1);
    expect(body.campaign.id).toBe("camp-1");
    expect(body.campaign.name).toBe("Campaign camp-1");
    expect(body.decks).toHaveLength(1);
    expect(body.decks[0]?.id).toBe("deck-1");
  });

  test("does not require authentication", async ({ dependencies }) => {
    const { db, app } = dependencies;
    const { account } = await createVerifiedAccount(
      db,
      dependencies.config,
      "anon@example.com",
    );
    await seedCampaign(db, account.id, makeCampaign("camp-1"), 1);

    const res = await app.request("/v2/public/campaign/camp-1");
    expect(res.status).toBe(200);
  });

  test("returns 404 for an unshared campaign, identical to an unknown id", async ({
    dependencies,
  }) => {
    const { db, app } = dependencies;
    const { account } = await createVerifiedAccount(
      db,
      dependencies.config,
      "private@example.com",
    );
    await seedCampaign(db, account.id, makeCampaign("camp-1"), 0);

    const unshared = await app.request("/v2/public/campaign/camp-1");
    const unknown = await app.request("/v2/public/campaign/does-not-exist");

    expect(unshared.status).toBe(404);
    expect(unknown.status).toBe(404);

    const body = await unshared.text();
    expect(body).toBe(JSON.stringify({ message: "Campaign not found" }));
    expect(body).toBe(await unknown.text());
  });

  test("excludes linked decks owned by another account", async ({
    dependencies,
  }) => {
    const { db, app } = dependencies;
    const { account } = await createVerifiedAccount(
      db,
      dependencies.config,
      "owner@example.com",
    );
    const other = await createVerifiedAccount(
      db,
      dependencies.config,
      "other@example.com",
    );

    await seedDeck(db, account.id, makeDeck("mine"));
    await seedDeck(db, other.account.id, makeDeck("theirs"));
    await seedCampaign(
      db,
      account.id,
      makeCampaign("camp-1", ["mine", "theirs"]),
      1,
    );

    const res = await app.request("/v2/public/campaign/camp-1");
    const body = PublicCampaignSchema.parse(await res.json());

    expect(body.decks).toHaveLength(1);
    expect(body.decks[0]?.id).toBe("mine");
  });

  test("skips deck ids with no matching deck", async ({ dependencies }) => {
    const { db, app } = dependencies;
    const { account } = await createVerifiedAccount(
      db,
      dependencies.config,
      "dangling@example.com",
    );

    await seedDeck(db, account.id, makeDeck("deck-1"));
    await seedCampaign(
      db,
      account.id,
      makeCampaign("camp-1", ["deck-1", "deleted"]),
      1,
    );

    const res = await app.request("/v2/public/campaign/camp-1");
    expect(res.status).toBe(200);

    const body = PublicCampaignSchema.parse(await res.json());
    expect(body.decks).toHaveLength(1);
    expect(body.decks[0]?.id).toBe("deck-1");
  });

  test("omits internal campaign and deck fields", async ({ dependencies }) => {
    const { db, app } = dependencies;
    const { account } = await createVerifiedAccount(
      db,
      dependencies.config,
      "fields@example.com",
    );

    await seedDeck(db, account.id, makeDeck("deck-1"));
    await seedCampaign(db, account.id, makeCampaign("camp-1", ["deck-1"]), 1);

    const body = (await (
      await app.request("/v2/public/campaign/camp-1")
    ).json()) as {
      campaign: Record<string, unknown>;
      decks: Record<string, unknown>[];
    };

    expect(body.campaign).not.toHaveProperty("deck_ids");
    expect(body.campaign).not.toHaveProperty("start_location");
    expect(body.decks[0]).not.toHaveProperty("user_id");
    expect(body.decks[0]).not.toHaveProperty("meta");
  });
});

describe("PUT /v2/account/campaigns/:id/visibility", () => {
  test("shares a campaign without touching revision or updated_at", async ({
    dependencies,
  }) => {
    const { db, app } = dependencies;
    const { account, cookie } = await createVerifiedAccount(
      db,
      dependencies.config,
      "toggle@example.com",
    );
    await seedCampaign(db, account.id, makeCampaign("camp-1"), 0);
    const before = await readCampaignRow(db, "camp-1");

    const res = await app.request("/v2/account/campaigns/camp-1/visibility", {
      method: "PUT",
      body: JSON.stringify({ public: true }),
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ public: true });

    const after = await readCampaignRow(db, "camp-1");
    expect(after.public).toBe(1);
    expect(after.revision).toBe(before.revision);
    expect(after.updated_at).toBe(before.updated_at);

    const publicRes = await app.request("/v2/public/campaign/camp-1");
    expect(publicRes.status).toBe(200);
  });

  test("unshares a campaign", async ({ dependencies }) => {
    const { db, app } = dependencies;
    const { account, cookie } = await createVerifiedAccount(
      db,
      dependencies.config,
      "unshare@example.com",
    );
    await seedCampaign(db, account.id, makeCampaign("camp-1"), 1);

    const res = await app.request("/v2/account/campaigns/camp-1/visibility", {
      method: "PUT",
      body: JSON.stringify({ public: false }),
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });
    expect(res.status).toBe(200);

    const publicRes = await app.request("/v2/public/campaign/camp-1");
    expect(publicRes.status).toBe(404);
  });

  test("reports the flag in the batch response", async ({ dependencies }) => {
    const { db, app } = dependencies;
    const { account, cookie } = await createVerifiedAccount(
      db,
      dependencies.config,
      "batch@example.com",
    );
    await seedCampaign(db, account.id, makeCampaign("camp-1"), 1);
    await seedCampaign(db, account.id, makeCampaign("camp-2"), 0);

    const res = await app.request("/v2/account/campaigns/batch", {
      method: "POST",
      body: JSON.stringify({ ids: ["camp-1", "camp-2"] }),
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });

    const body = CampaignBatchResponseSchema.parse(await res.json());
    const byId = new Map(
      body.campaigns.map((item) => [item.data.id, item.public]),
    );

    expect(byId.get("camp-1")).toBe(true);
    expect(byId.get("camp-2")).toBe(false);
  });

  test("reads back the current flag", async ({ dependencies }) => {
    const { db, app } = dependencies;
    const { account, cookie } = await createVerifiedAccount(
      db,
      dependencies.config,
      "read@example.com",
    );
    await seedCampaign(db, account.id, makeCampaign("camp-1"), 1);
    await seedCampaign(db, account.id, makeCampaign("camp-2"), 0);

    const shared = await app.request(
      "/v2/account/campaigns/camp-1/visibility",
      { headers: { Cookie: cookie } },
    );
    const unshared = await app.request(
      "/v2/account/campaigns/camp-2/visibility",
      { headers: { Cookie: cookie } },
    );

    expect(await shared.json()).toEqual({ public: true });
    expect(await unshared.json()).toEqual({ public: false });
  });

  test("does not read another account's flag", async ({ dependencies }) => {
    const { db, app } = dependencies;
    const { account } = await createVerifiedAccount(
      db,
      dependencies.config,
      "reader-victim@example.com",
    );
    const attacker = await createVerifiedAccount(
      db,
      dependencies.config,
      "reader-attacker@example.com",
    );
    await seedCampaign(db, account.id, makeCampaign("camp-1"), 1);

    const res = await app.request("/v2/account/campaigns/camp-1/visibility", {
      headers: { Cookie: attacker.cookie },
    });

    expect(res.status).toBe(404);
  });

  test("returns 404 for a campaign owned by another account", async ({
    dependencies,
  }) => {
    const { db, app } = dependencies;
    const { account } = await createVerifiedAccount(
      db,
      dependencies.config,
      "victim@example.com",
    );
    const attacker = await createVerifiedAccount(
      db,
      dependencies.config,
      "attacker@example.com",
    );
    await seedCampaign(db, account.id, makeCampaign("camp-1"), 0);

    const res = await app.request("/v2/account/campaigns/camp-1/visibility", {
      method: "PUT",
      body: JSON.stringify({ public: true }),
      headers: {
        Cookie: attacker.cookie,
        "Content-Type": "application/json",
      },
    });

    expect(res.status).toBe(404);
    expect((await readCampaignRow(db, "camp-1")).public).toBe(0);
  });

  test("returns 401 when unauthenticated", async ({ dependencies }) => {
    const res = await dependencies.app.request(
      "/v2/account/campaigns/camp-1/visibility",
      {
        method: "PUT",
        body: JSON.stringify({ public: true }),
        headers: { "Content-Type": "application/json" },
      },
    );

    expect(res.status).toBe(401);
  });
});

async function seedCampaign(
  db: Database,
  accountId: string,
  campaign: Campaign,
  isPublic: number,
) {
  const now = new Date().toISOString();
  await db
    .insertInto("account_campaign")
    .values({
      id: String(campaign.id),
      account_id: accountId,
      revision: randomUUID(),
      data: JSON.stringify(campaign),
      public: isPublic,
      created_at: now,
      updated_at: now,
    })
    .execute();
}

async function seedDeck(db: Database, accountId: string, deck: Deck) {
  const now = new Date().toISOString();
  await db
    .insertInto("account_deck")
    .values({
      id: String(deck.id),
      account_id: accountId,
      revision: randomUUID(),
      data: JSON.stringify(deck),
      created_at: now,
      updated_at: now,
    })
    .execute();
}

async function readCampaignRow(db: Database, id: string) {
  return await db
    .selectFrom("account_campaign")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirstOrThrow();
}
