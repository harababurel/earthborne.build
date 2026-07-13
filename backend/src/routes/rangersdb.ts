import { RangersDbDeckSchema } from "@earthborne-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HonoEnv } from "../lib/hono-env.ts";

// Proxied because RangersDB's GraphQL API only allows CORS requests from
// rangersdb.com, so browsers cannot query it directly.
const router = new Hono<HonoEnv>();

router.get("/deck/:id", async (c) => {
  const id = Number.parseInt(c.req.param("id"), 10);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !/^\d+$/.test(c.req.param("id"))
  ) {
    throw new HTTPException(400, { message: "Invalid deck id." });
  }

  const graphqlUrl = c.get("config").RANGERSDB_GRAPHQL_URL;

  const deckData = (await queryRangersDb(graphqlUrl, DECK_QUERY, { id })) as
    | { rangers_deck_by_pk?: unknown }
    | undefined;
  const deck = deckData?.rangers_deck_by_pk;

  if (!deck) {
    throw new HTTPException(404, {
      message: "Deck not found on RangersDB or not publicly accessible.",
    });
  }

  const parsed = RangersDbDeckSchema.safeParse(deck);

  if (!parsed.success) {
    throw new HTTPException(502, {
      message: "RangersDB returned a deck in an unexpected format.",
    });
  }

  parsed.data.cards = await fetchCardNames(graphqlUrl, parsed.data);

  return c.json(parsed.data);
});

const DECK_QUERY = `
  query DeckById($id: Int!) {
    rangers_deck_by_pk(id: $id) {
      id
      name
      created_at
      like_count
      comment_count
      user {
        handle
      }
      awa
      spi
      fit
      foc
      meta
      slots
    }
  }
`;

const CARD_NAMES_QUERY = `
  query CardNames($codes: [String!]) {
    rangers_card_localized(
      where: {
        locale: { _eq: "en" }
        taboo_id: { _is_null: true }
        code: { _in: $codes }
      }
    ) {
      code
      real_name
    }
  }
`;

// RangersDB and earthborne.build track different forks of rangers-card-data,
// so a card code is not guaranteed to reference the same card in both. Return
// RangersDB's names for the deck's codes so the client can cross-check them.
// Best-effort: the deck is still importable without the names.
async function fetchCardNames(
  graphqlUrl: string,
  deck: {
    slots?: Record<string, number> | null | undefined;
    meta?: unknown;
  },
): Promise<Record<string, string> | undefined> {
  const meta = deck.meta as { role?: unknown } | null | undefined;
  const codes = Object.keys(deck.slots ?? {});
  if (typeof meta?.role === "string") codes.push(meta.role);
  if (!codes.length) return undefined;

  let data: unknown;
  try {
    data = await queryRangersDb(graphqlUrl, CARD_NAMES_QUERY, { codes });
  } catch {
    return undefined;
  }

  const rows = (data as { rangers_card_localized?: unknown } | undefined)
    ?.rangers_card_localized;
  if (!Array.isArray(rows)) return undefined;

  const names: Record<string, string> = {};
  for (const row of rows as { code?: unknown; real_name?: unknown }[]) {
    if (typeof row?.code === "string" && typeof row?.real_name === "string") {
      names[row.code] = row.real_name;
    }
  }

  return names;
}

async function queryRangersDb(
  graphqlUrl: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<unknown> {
  let res: Response;

  try {
    res = await fetch(graphqlUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new HTTPException(502, { message: "Could not reach RangersDB." });
  }

  if (!res.ok) {
    throw new HTTPException(502, { message: "Could not reach RangersDB." });
  }

  const body = (await res.json()) as { data?: unknown };
  return body.data;
}

export default router;
