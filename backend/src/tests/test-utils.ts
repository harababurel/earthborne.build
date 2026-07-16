import { randomUUID } from "node:crypto";
import type { Campaign, Deck } from "@earthborne-build/shared";
import { test as base } from "vitest";
import { appFactory } from "../app.ts";
import { applySqlFiles } from "../db/db.helpers.ts";
import { type Database, getDatabase } from "../db/db.ts";
import { createAccount } from "../db/queries/auth/accounts.ts";
import { updateAccountIdentityVerified } from "../db/queries/auth/identities.ts";
import { hashPassword } from "../lib/auth/crypto.ts";
import { createSession } from "../lib/auth/sessions.ts";
import { configFromEnv } from "../lib/config.ts";

// Hashed once per run: scrypt is deliberately slow, and every test account
// shares the same password.
export const TEST_PASSWORD_HASH = await hashPassword("password123");

function getDependencies() {
  // Each test context gets a fresh in-memory database.
  const db = getDatabase(":memory:");
  const config = configFromEnv();
  const app = appFactory(config, db);
  return { app, config, db };
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

export async function createVerifiedAccount(
  db: Database,
  config: { SESSION_COOKIE_NAME: string },
  email: string,
  name = `user_${randomUUID()}`,
) {
  const result = await createAccount(db, {
    name,
    email,
    passwordHash: TEST_PASSWORD_HASH,
    profileCompletedAt: new Date().toISOString(),
  });
  await updateAccountIdentityVerified(db, result.accountIdentity.id);
  const { token } = await createSession(db, result.account.id, 720);
  const cookie = `${config.SESSION_COOKIE_NAME}=${token}`;
  return { account: result.account, cookie };
}

export function makeDeck(id: string): Deck {
  return {
    id,
    date_creation: "2026-01-01T00:00:00.000Z",
    date_update: "2026-01-01T00:00:00.000Z",
    description_md: "",
    meta: "{}",
    name: `Deck ${id}`,
    problem: null,
    slots: {},
    rewards: null,
    displaced: null,
    maladies: null,
    source: undefined,
    tags: "",
    user_id: null,
    aspect_code: "awareness",
    role_code: "01001",
    background: "forager",
    specialty: "artist",
  };
}

export function makeCampaign(id: string, deckIds: string[] = []): Campaign {
  return {
    id,
    name: `Campaign ${id}`,
    date_creation: "2026-01-01T00:00:00.000Z",
    date_update: "2026-01-01T00:00:00.000Z",
    cycle_id: "core",
    expansions: [],
    extended_calendar: false,
    day: 1,
    start_location: null,
    current_location: null,
    current_path_terrain: null,
    history: [],
    missions: [],
    calendar: [],
    events: [],
    notes: [],
    rewards: [],
    removed: [],
    deck_ids: deckIds,
    previous_campaign_id: null,
    next_campaign_id: null,
  };
}
