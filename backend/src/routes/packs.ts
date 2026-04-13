import { Hono } from "hono";
import { getAllPacks } from "../db/queries/pack.ts";
import type { HonoEnv } from "../lib/hono-env.ts";

const router = new Hono<HonoEnv>();

router.get("/", async (c) => {
  const packs = await getAllPacks(c.get("db"));
  return c.json({ data: packs });
});

export default router;
