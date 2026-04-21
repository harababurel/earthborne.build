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
});
