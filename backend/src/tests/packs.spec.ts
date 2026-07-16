import { describe, expect } from "vitest";
import { test } from "./test-utils.ts";

describe("GET /v2/public/packs", () => {
  test("returns an empty array when no packs are ingested", async ({
    dependencies,
  }) => {
    const res = await dependencies.app.request("/v2/public/packs");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  test("returns packs ordered by position", async ({ dependencies }) => {
    await dependencies.db
      .insertInto("pack")
      .values([
        { id: "core2", name: "Core Set 2", short_name: "C2", position: 2 },
        { id: "core1", name: "Core Set 1", short_name: "C1", position: 1 },
        {
          id: "expansion",
          name: "Expansion",
          short_name: "EXP",
          position: 3,
        },
      ])
      .execute();

    const res = await dependencies.app.request("/v2/public/packs");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { id: string; code: string; name: string }[];
    };
    expect(body.data).toHaveLength(3);
    expect(body.data.map((p) => p.id)).toEqual(["core1", "core2", "expansion"]);
  });
});
