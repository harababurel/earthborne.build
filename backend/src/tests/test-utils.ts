import { test as base } from "vitest";
import { appFactory } from "../app.ts";
import { applySqlFiles } from "../db/db.helpers.ts";
import { getDatabase } from "../db/db.ts";
import { configFromEnv } from "../lib/config.ts";

function getDependencies() {
  // Each test context gets a fresh in-memory database.
  const db = getDatabase(":memory:");
  const config = configFromEnv();
  const app = appFactory(config, db);
  return { app, db };
}

export const test = base.extend<{
  dependencies: ReturnType<typeof getDependencies>;
}>({
  // biome-ignore lint/correctness/noEmptyPattern: vitest expects a destructure here
  dependencies: async ({}, use) => {
    const deps = getDependencies();
    await applySqlFiles(deps.db, "../db/migrations");
    await use(deps);
    await deps.db.destroy();
  },
});
