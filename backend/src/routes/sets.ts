import { Hono } from "hono";
import { getAllSets } from "../db/queries/set.ts";
import type { HonoEnv } from "../lib/hono-env.ts";

const router = new Hono<HonoEnv>();

router.get("/", async (c) => {
  const sets = await getAllSets(c.get("db"));
  return c.json({ data: sets });
});

export default router;
