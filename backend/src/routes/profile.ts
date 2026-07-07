import { UpdateProfileRequestSchema } from "@earthborne-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  accountNameExists,
  renameAccount,
} from "../db/queries/auth/accounts.ts";
import { sessionAuth } from "../lib/auth/session-auth-middleware.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import { zodValidator } from "../lib/validation.ts";

const router = new Hono<HonoEnv>();

router.patch(
  "/",
  sessionAuth(),
  zodValidator("json", UpdateProfileRequestSchema),
  async (c) => {
    const account = c.get("account");
    const { username } = c.req.valid("json");

    await c
      .get("db")
      .transaction()
      .execute(async (tx) => {
        if (await accountNameExists(tx, username, account.id)) {
          throw new HTTPException(400, {
            message: "Username is already taken",
          });
        }

        await renameAccount(tx, account.id, username);
      });

    return new Response(null, { status: 200 });
  },
);

export default router;
