import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { NoResultError } from "kysely";
import { getAllCards, getCardByCode } from "../db/queries/card.ts";
import type { HonoEnv } from "../lib/hono-env.ts";

const router = new Hono<HonoEnv>();

router.get("/", async (c) => {
  const cards = await getAllCards(c.get("db"));
  return c.json({ data: cards });
});

router.get("/:code", async (c) => {
  const code = c.req.param("code");

  try {
    const card = await getCardByCode(c.get("db"), code);
    return c.json(card);
  } catch (error) {
    if (error instanceof NoResultError) {
      throw new HTTPException(404, { message: `Card '${code}' not found.` });
    }

    throw error;
  }
});

export default router;
