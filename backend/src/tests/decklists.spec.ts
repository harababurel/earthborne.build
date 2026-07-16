import { describe, expect } from "vitest";
import { test } from "./test-utils.ts";

describe("GET /v2/public/decklists", () => {
  test("returns empty results when no decks are shared", async ({
    dependencies,
  }) => {
    const res = await dependencies.app.request("/v2/public/decklists");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: unknown[];
      meta: { total: number; limit: number; offset: number };
    };
    expect(body.data).toHaveLength(0);
    expect(body.meta.total).toBe(0);
  });

  test("returns 400 for malformed required query param", async ({
    dependencies,
  }) => {
    const res = await dependencies.app.request(
      "/v2/public/decklists?required=invalid%20code!",
    );
    expect(res.status).toBe(400);
  });

  test("returns 400 for required param exceeding max length", async ({
    dependencies,
  }) => {
    const res = await dependencies.app.request(
      `/v2/public/decklists?required=${"x".repeat(65)}`,
    );
    expect(res.status).toBe(400);
  });
});
