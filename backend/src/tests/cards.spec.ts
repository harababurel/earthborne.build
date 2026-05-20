import { describe, expect } from "vitest";
import { test } from "./test-utils.ts";

describe("GET /v2/public/cards", () => {
  test("returns an empty array when no cards are ingested", async ({
    dependencies,
  }) => {
    const res = await dependencies.app.request("/v2/public/cards");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe("GET /v2/public/cards/:code", () => {
  test("returns 404 for an unknown card code", async ({ dependencies }) => {
    const res = await dependencies.app.request("/v2/public/cards/99999");
    expect(res.status).toBe(404);
  });

  test("returns alternate image metadata when present", async ({
    dependencies,
  }) => {
    await dependencies.db
      .insertInto("pack")
      .values({
        id: "ebr",
        name: "Earthborne Rangers",
        short_name: null,
        position: 1,
      })
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
        id: "01037",
        code: "01037",
        pack_id: "ebr",
        category_id: "ranger",
        type_id: "role",
        name: "Undaunted Seeker",
        alt_imagesrc: "https://example.invalid/sheet.jpg",
        alt_image_rect: "[29,10,7]",
        alt_illustrator: "Mini Ranger Artist",
      })
      .execute();

    const res = await dependencies.app.request("/v2/public/cards/01037");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      alt_image_url: string | null;
      alt_illustrator: string | null;
    };

    expect(body.alt_image_url).toBe("01037a");
    expect(body.alt_illustrator).toBe("Mini Ranger Artist");
  });
});
