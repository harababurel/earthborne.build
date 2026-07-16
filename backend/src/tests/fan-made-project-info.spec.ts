import { describe, expect } from "vitest";
import { test } from "./test-utils.ts";

describe("GET /v2/public/fan-made-project-info", () => {
  test("returns an empty array when no projects exist", async ({
    dependencies,
  }) => {
    const res = await dependencies.app.request(
      "/v2/public/fan-made-project-info",
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  test("returns all projects when seeded", async ({ dependencies }) => {
    await dependencies.db
      .insertInto("fan_made_project_info")
      .values([
        {
          id: "proj-a",
          bucket_path: "/a",
          meta: JSON.stringify({
            code: "proj-a",
            name: "Project A",
            description: "First project",
            language: "en",
            author: "Author A",
          }),
        },
        {
          id: "proj-b",
          bucket_path: "/b",
          meta: JSON.stringify({
            code: "proj-b",
            name: "Project B",
            description: "Second project",
            language: "en",
            author: "Author B",
          }),
        },
      ])
      .execute();

    const res = await dependencies.app.request(
      "/v2/public/fan-made-project-info",
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { meta: { code: string } }[];
    };
    expect(body.data).toHaveLength(2);
    expect(body.data.map((p) => p.meta.code).sort()).toEqual([
      "proj-a",
      "proj-b",
    ]);
  });

  test("skips rows with corrupt meta instead of failing the listing", async ({
    dependencies,
  }) => {
    await dependencies.db
      .insertInto("fan_made_project_info")
      .values([
        {
          id: "proj-good",
          bucket_path: "/good",
          meta: JSON.stringify({
            code: "proj-good",
            name: "Good Project",
            description: "Valid project",
            language: "en",
            author: "Author",
          }),
        },
        {
          id: "proj-bad",
          bucket_path: "/bad",
          meta: "not json",
        },
      ])
      .execute();

    const res = await dependencies.app.request(
      "/v2/public/fan-made-project-info",
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string }[] };
    expect(body.data.map((p) => p.id)).toEqual(["proj-good"]);
  });
});

describe("GET /v2/public/fan-made-project-info/:id", () => {
  test("returns 404 for an unknown project", async ({ dependencies }) => {
    const res = await dependencies.app.request(
      "/v2/public/fan-made-project-info/unknown",
    );
    expect(res.status).toBe(404);
  });

  test("returns a project when it exists", async ({ dependencies }) => {
    await dependencies.db
      .insertInto("fan_made_project_info")
      .values({
        id: "proj-x",
        bucket_path: "/x",
        meta: JSON.stringify({
          code: "proj-x",
          name: "Project X",
          description: "A test project",
          language: "en",
          author: "Author X",
        }),
      })
      .execute();

    const res = await dependencies.app.request(
      "/v2/public/fan-made-project-info/proj-x",
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { meta: { name: string } };
    expect(body.meta.name).toBe("Project X");
  });

  test("returns 500 when the project's meta is corrupt", async ({
    dependencies,
  }) => {
    await dependencies.db
      .insertInto("fan_made_project_info")
      .values({
        id: "proj-corrupt",
        bucket_path: "/corrupt",
        meta: "not json",
      })
      .execute();

    const res = await dependencies.app.request(
      "/v2/public/fan-made-project-info/proj-corrupt",
    );
    expect(res.status).toBe(500);
  });
});
