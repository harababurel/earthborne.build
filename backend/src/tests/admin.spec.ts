import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appFactory } from "../app.ts";
import { applySqlFiles } from "../db/db.helpers.ts";
import { type Database, getDatabase } from "../db/db.ts";
import { type Config, configFromEnv } from "../lib/config.ts";
import { CaptureMailer } from "../lib/email/mailer.ts";

type TestContext = {
  app: ReturnType<typeof appFactory>;
  config: Config;
  db: Database;
};

let ctx: TestContext;

beforeEach(async () => {
  const db = getDatabase(":memory:");
  await applySqlFiles(db, "../db/migrations");
  const config = configFromEnv();
  const mailer = new CaptureMailer();
  const app = appFactory(config, db, mailer);
  ctx = { app, config, db };
});

afterEach(async () => {
  await ctx.db.destroy();
});

describe("admin routes", () => {
  it("rejects wrong-length API keys", async () => {
    const res = await upsertProjectInfo("short");
    expect(res.status).toBe(401);
  });

  it("accepts the configured API key", async () => {
    const res = await upsertProjectInfo(ctx.config.ADMIN_API_KEY);
    expect(res.status).toBe(201);

    await expect(
      ctx.db.selectFrom("fan_made_project_info").selectAll().execute(),
    ).resolves.toHaveLength(1);
  });
});

async function upsertProjectInfo(token: string) {
  return await ctx.app.request("/admin/fan_made_project_info", {
    method: "POST",
    body: JSON.stringify({
      bucket_path: "fan-made/test",
      meta: {
        author: "Tester",
        code: "tst",
        language: "en",
        name: "Test Project",
      },
    }),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}
