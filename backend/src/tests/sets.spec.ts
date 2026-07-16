import { describe, expect } from "vitest";
import { test } from "./test-utils.ts";

describe("GET /v2/public/sets", () => {
  test("returns an empty array when no sets are ingested", async ({
    dependencies,
  }) => {
    const res = await dependencies.app.request("/v2/public/sets");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  test("returns sets with their pack_code from card joins", async ({
    dependencies,
  }) => {
    await dependencies.db
      .insertInto("pack")
      .values({
        id: "ebr",
        name: "Earthborne Rangers",
        short_name: "EBR",
        position: 1,
      })
      .execute();

    await dependencies.db
      .insertInto("set_type")
      .values({ id: "card_set", name: "Card Set" })
      .execute();

    await dependencies.db
      .insertInto("card_set")
      .values([{ id: "set-a", name: "Set A", type_id: "card_set", size: 40 }])
      .execute();

    await dependencies.db
      .insertInto("card_type")
      .values({ id: "role", name: "Role" })
      .execute();

    await dependencies.db
      .insertInto("category")
      .values({ id: "ranger", name: "Ranger" })
      .execute();

    await dependencies.db
      .insertInto("card")
      .values({
        id: "01001",
        code: "01001",
        pack_id: "ebr",
        category_id: "ranger",
        type_id: "role",
        name: "Test Card",
        set_id: "set-a",
      })
      .execute();

    const res = await dependencies.app.request("/v2/public/sets");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { id: string; code: string; name: string; pack_code: string }[];
    };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: "set-a",
      code: "set-a",
      name: "Set A",
      pack_code: "ebr",
    });
  });
});
