import { randomUUID } from "node:crypto";
import { describe, expect } from "vitest";
import type { Database } from "../db/db.ts";
import { createVerifiedAccount, test } from "./test-utils.ts";

type Entity = { id: string | number; name: string };

type EntityCrudOptions = {
  // Singular, used in test names: "deck" | "campaign".
  label: string;
  // URL segment: "decks" | "campaigns".
  path: string;
  table: "account_deck" | "account_campaign";
  // Key holding the entity list in the batch response.
  responseKey: string;
  makeEntity: (id: string) => Entity;
};

// The deck and campaign routes implement the same revisioned CRUD contract,
// so both spec files instantiate this suite instead of duplicating it.
export function describeAccountEntityCrud(options: EntityCrudOptions) {
  const { label, path, table, responseKey, makeEntity } = options;
  const baseUrl = `/v2/account/${path}`;

  async function seed(
    db: Database,
    accountId: string,
    entity: Entity,
    revision = randomUUID(),
  ) {
    await db
      .insertInto(table)
      .values({
        id: String(entity.id),
        account_id: accountId,
        revision,
        data: JSON.stringify(entity),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();
    return revision;
  }

  describe(`POST ${baseUrl}`, () => {
    test("returns 401 when unauthenticated", async ({ dependencies }) => {
      const res = await dependencies.app.request(baseUrl, {
        method: "POST",
        body: JSON.stringify({ data: makeEntity("entity-1") }),
        headers: { "Content-Type": "application/json" },
      });
      expect(res.status).toBe(401);
    });

    test(`creates a ${label} and returns its revision`, async ({
      dependencies,
    }) => {
      const { cookie } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "create@example.com",
      );

      const entity = makeEntity("created");
      const res = await dependencies.app.request(baseUrl, {
        method: "POST",
        body: JSON.stringify({ data: entity }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { revision: string };
      expect(body.revision).toBeDefined();
      expect(body.revision).toHaveLength(36); // UUID

      const row = await dependencies.db
        .selectFrom(table)
        .selectAll()
        .where("id", "=", "created")
        .executeTakeFirstOrThrow();
      expect(JSON.parse(row.data).name).toBe(entity.name);
    });

    test(`returns 409 when creating a ${label} with a duplicate id`, async ({
      dependencies,
    }) => {
      const { cookie, account } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "dup@example.com",
      );
      await seed(dependencies.db, account.id, makeEntity("dup"));

      const res = await dependencies.app.request(baseUrl, {
        method: "POST",
        body: JSON.stringify({ data: makeEntity("dup") }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      });
      expect(res.status).toBe(409);
    });
  });

  describe(`POST ${baseUrl}/batch`, () => {
    test(`fetches multiple ${path} by id`, async ({ dependencies }) => {
      const { cookie, account } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "batch@example.com",
      );

      const entity1 = makeEntity("batch-1");
      const entity2 = makeEntity("batch-2");
      await seed(dependencies.db, account.id, entity1);
      await seed(dependencies.db, account.id, entity2);

      const res = await dependencies.app.request(`${baseUrl}/batch`, {
        method: "POST",
        body: JSON.stringify({ ids: ["batch-1", "batch-2", "missing"] }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<
        string,
        { data: { name: string } }[]
      >;
      expect(body[responseKey]).toHaveLength(2);
      const names = body[responseKey]?.map((e) => e.data.name).sort();
      expect(names).toEqual([entity1.name, entity2.name].sort());
    });
  });

  describe(`PUT ${baseUrl}/:id`, () => {
    test(`updates an existing ${label}`, async ({ dependencies }) => {
      const { cookie, account } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "update@example.com",
      );
      const revision = await seed(
        dependencies.db,
        account.id,
        makeEntity("updated"),
      );

      const updatedEntity = { ...makeEntity("updated"), name: "New Name" };
      const res = await dependencies.app.request(`${baseUrl}/updated`, {
        method: "PUT",
        body: JSON.stringify({
          data: updatedEntity,
          expectedRevision: revision,
        }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { revision: string };
      expect(body.revision).toBeDefined();
      expect(body.revision).not.toBe(revision);

      const row = await dependencies.db
        .selectFrom(table)
        .select("data")
        .where("id", "=", "updated")
        .executeTakeFirstOrThrow();
      expect(JSON.parse(row.data).name).toBe("New Name");
    });

    test(`returns 400 when ${label} id does not match URL`, async ({
      dependencies,
    }) => {
      const { cookie } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "mismatch@example.com",
      );

      const res = await dependencies.app.request(`${baseUrl}/url-id`, {
        method: "PUT",
        body: JSON.stringify({
          data: makeEntity("different-id"),
          expectedRevision: randomUUID(),
        }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      });
      expect(res.status).toBe(400);
    });

    test(`returns 404 when ${label} does not exist`, async ({
      dependencies,
    }) => {
      const { cookie } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "missing@example.com",
      );

      const res = await dependencies.app.request(`${baseUrl}/missing-id`, {
        method: "PUT",
        body: JSON.stringify({
          data: makeEntity("missing-id"),
          expectedRevision: randomUUID(),
        }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      });
      expect(res.status).toBe(404);
    });

    test("returns 409 on revision conflict", async ({ dependencies }) => {
      const { cookie, account } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "conflict@example.com",
      );
      await seed(dependencies.db, account.id, makeEntity("conflict"));

      const res = await dependencies.app.request(`${baseUrl}/conflict`, {
        method: "PUT",
        body: JSON.stringify({
          data: makeEntity("conflict"),
          expectedRevision: randomUUID(), // Wrong revision.
        }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      });
      expect(res.status).toBe(409);
    });
  });

  describe(`DELETE ${baseUrl}/:id`, () => {
    test(`deletes an existing ${label}`, async ({ dependencies }) => {
      const { cookie, account } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "delete@example.com",
      );
      const revision = await seed(
        dependencies.db,
        account.id,
        makeEntity("deleted"),
      );

      const res = await dependencies.app.request(`${baseUrl}/deleted`, {
        method: "DELETE",
        body: JSON.stringify({ expectedRevision: revision }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string };
      expect(body.status).toBe("ok");

      const row = await dependencies.db
        .selectFrom(table)
        .selectAll()
        .where("id", "=", "deleted")
        .executeTakeFirst();
      expect(row).toBeUndefined();
    });

    test(`returns 404 when ${label} does not exist`, async ({
      dependencies,
    }) => {
      const { cookie } = await createVerifiedAccount(
        dependencies.db,
        dependencies.config,
        "delete-missing@example.com",
      );

      const res = await dependencies.app.request(`${baseUrl}/missing-id`, {
        method: "DELETE",
        body: JSON.stringify({ expectedRevision: randomUUID() }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      });
      expect(res.status).toBe(404);
    });
  });
}
