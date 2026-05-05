import fs from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HonoEnv } from "../lib/hono-env.ts";

const router = new Hono<HonoEnv>();

router.get("/:code", async (c) => {
  const config = c.get("config");

  if (!config.IMAGE_DIR) {
    throw new HTTPException(503, { message: "Image serving not configured." });
  }

  const code = c.req.param("code").replace(/[^0-9a-z]/gi, "");
  if (!code) throw new HTTPException(400, { message: "Invalid card code." });

  const cardCode = code.endsWith("b") ? code.slice(0, -1) : code;
  if (!cardCode)
    throw new HTTPException(400, { message: "Invalid card code." });

  const card = await c
    .get("db")
    .selectFrom("card")
    .select("pack_id")
    .where("code", "=", cardCode)
    .executeTakeFirst();

  if (!card)
    throw new HTTPException(404, { message: `Card '${code}' not found.` });

  const filePath = path.join(config.IMAGE_DIR, card.pack_id, `${code}.jpg`);

  let data: Buffer;
  try {
    data = await fs.readFile(filePath);
  } catch {
    throw new HTTPException(404, {
      message: `Image for '${code}' not found on disk.`,
    });
  }

  c.header("Content-Type", "image/jpeg");
  c.header("Cache-Control", "public, max-age=31536000, immutable");
  return c.body(data.buffer as ArrayBuffer);
});

export default router;
