import { afterAll, beforeAll } from "vitest";
import { applySqlFiles } from "../db/db.helpers.ts";
import { getDatabase } from "../db/db.ts";

// Shared in-memory database for all tests in a suite.
// Each test gets a fresh database via test-utils.ts.
beforeAll(async () => {
  // Verify migrations apply cleanly against an in-memory database.
  const db = getDatabase(":memory:");
  await applySqlFiles(db, "../db/migrations");
  await db.destroy();
});

afterAll(() => {
  // Nothing to tear down — no containers.
});
