import { timingSafeEqual } from "node:crypto";
import { FanMadeProjectInfoSchema } from "@earthborne-build/shared";
import { type Context, Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { upsertFanMadeProjectInfo } from "../db/queries/fan-made-project-info.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import { zodValidator } from "../lib/validation.ts";

const router = new Hono<HonoEnv>();

const adminKeyMiddleware = bearerAuth({
  verifyToken: (token, c: Context<HonoEnv>) =>
    safeKeyCompare(token, c.get("config").ADMIN_API_KEY),
});

router.use(adminKeyMiddleware);

router.post(
  "/fan_made_project_info",
  zodValidator("json", FanMadeProjectInfoSchema.omit({ id: true })),
  async (c) => {
    const body = c.req.valid("json");

    await upsertFanMadeProjectInfo(c.get("db"), body);

    c.status(201);
    return c.body(null);
  },
);

export default router;

function safeKeyCompare(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) return false;

  return timingSafeEqual(bufferA, bufferB);
}
