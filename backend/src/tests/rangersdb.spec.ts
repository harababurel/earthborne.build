import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect } from "vitest";
import { test } from "./test-utils.ts";

const DECK_FIXTURE = {
  id: 39996,
  name: "test1",
  created_at: "2026-07-12T08:25:19.966001+00:00",
  like_count: 3,
  comment_count: 1,
  user: { handle: "sergiu" },
  awa: 1,
  spi: 3,
  fit: 2,
  foc: 2,
  meta: { role: "03037", specialty: "spirit_speaker", background: "traveler" },
  slots: { "01001": 2, "01094": 2 },
};

const CARD_NAMES_FIXTURE: Record<string, string> = {
  "01001": "Eagle Eye",
  "01094": "Vigilant",
  "03037": "Keeper of the Grove",
};

let stub: Server;
let stubUrl: string;

// Stub of the RangersDB GraphQL endpoint: serves the deck fixture for id
// 39996 (null otherwise, mirroring Hasura's rangers_deck_by_pk behavior) and
// card names for the card-names cross-check query.
beforeAll(async () => {
  stub = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      const body = JSON.parse(raw) as {
        variables?: { id?: number; codes?: string[] };
      };
      res.setHeader("content-type", "application/json");

      if (body.variables?.codes) {
        const rows = body.variables.codes
          .filter((code) => CARD_NAMES_FIXTURE[code])
          .map((code) => ({ code, real_name: CARD_NAMES_FIXTURE[code] }));
        res.end(JSON.stringify({ data: { rangers_card_localized: rows } }));
        return;
      }

      const deck = body.variables?.id === DECK_FIXTURE.id ? DECK_FIXTURE : null;
      res.end(JSON.stringify({ data: { rangers_deck_by_pk: deck } }));
    });
  });

  await new Promise<void>((resolve) => stub.listen(0, "127.0.0.1", resolve));
  const address = stub.address() as AddressInfo;
  stubUrl = `http://127.0.0.1:${address.port}/v1/graphql`;
  process.env["RANGERSDB_GRAPHQL_URL"] = stubUrl;
});

afterAll(async () => {
  delete process.env["RANGERSDB_GRAPHQL_URL"];
  await new Promise((resolve) => stub.close(resolve));
});

describe("GET /v2/public/rangersdb/deck/:id", () => {
  test("returns the deck for a known id", async ({ dependencies }) => {
    const res = await dependencies.app.request(
      "/v2/public/rangersdb/deck/39996",
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ...DECK_FIXTURE,
      cards: CARD_NAMES_FIXTURE,
    });
  });

  test("returns 404 for an unknown deck", async ({ dependencies }) => {
    const res = await dependencies.app.request("/v2/public/rangersdb/deck/1");
    expect(res.status).toBe(404);
  });

  test("returns 400 for a non-numeric id", async ({ dependencies }) => {
    const res = await dependencies.app.request(
      "/v2/public/rangersdb/deck/nope",
    );
    expect(res.status).toBe(400);
  });

  test("returns 502 when RangersDB is unreachable", async ({
    dependencies: _,
  }) => {
    process.env["RANGERSDB_GRAPHQL_URL"] = "http://127.0.0.1:1/v1/graphql";
    try {
      const { appFactory } = await import("../app.ts");
      const { getDatabase } = await import("../db/db.ts");
      const { configFromEnv } = await import("../lib/config.ts");
      const db = getDatabase(":memory:");
      const app = appFactory(configFromEnv(), db);
      const res = await app.request("/v2/public/rangersdb/deck/39996");
      expect(res.status).toBe(502);
      await db.destroy();
    } finally {
      process.env["RANGERSDB_GRAPHQL_URL"] = stubUrl;
    }
  });
});
