import { DecklistSearchRequestSchema } from "@earthborne-build/shared";
import { Hono } from "hono";
import { searchSharedDecks } from "../db/queries/decklists.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import { zodValidator } from "../lib/validation.ts";

const router = new Hono<HonoEnv>();

router.get(
  "/",
  zodValidator("query", DecklistSearchRequestSchema),
  async (c) => {
    const query = c.req.valid("query");
    const db = c.get("db");

    const results = await searchSharedDecks(db, query);

    return c.json({
      data: results.data,
      meta: {
        total: results.total,
        limit: query.limit,
        offset: query.offset,
      },
    });
  },
);

export default router;
