import { DeckSchema } from "@earthborne-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { isUniqueConstraintError } from "../db/queries/account-decks.ts";
import {
  createSharedDeck,
  deleteSharedDeck,
  getSharedDeck,
  updateSharedDeck,
} from "../db/queries/sharing.ts";
import { rateLimit } from "../lib/auth/rate-limit.ts";
import { optionalSessionAuth } from "../lib/auth/session-auth-middleware.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import { zodValidator } from "../lib/validation.ts";

const SHARE_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

const ShareRequestSchema = DeckSchema.extend({
  id: z.union([z.number().int().nonnegative(), z.string().min(1).max(64)]),
  history: z.array(z.record(z.string(), z.unknown())).max(100).default([]),
  listed: z.boolean().default(false),
});

const router = new Hono<HonoEnv>();

router.post(
  "/",
  rateLimit({
    scope: "share-create",
    limit: 20,
    windowMs: SHARE_RATE_LIMIT_WINDOW_MS,
  }),
  optionalSessionAuth(),
  zodValidator("json", ShareRequestSchema),
  async (c) => {
    const clientId = requireClientId(c.req.header("X-Client-Id"));
    const { history, listed, ...deck } = c.req.valid("json");
    const account = c.get("account");

    if (listed && !account) throw loginRequiredToList();

    try {
      await createSharedDeck(c.get("db"), {
        account_id: account?.id ?? null,
        id: deck.id.toString(),
        client_id: clientId,
        listed: listed ? 1 : 0,
        data: JSON.stringify(deck),
        history: JSON.stringify(history),
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new HTTPException(409, {
          message: "A share already exists for this deck id",
        });
      }

      throw error;
    }

    return c.json({ status: "ok" });
  },
);

router.get("/history/:id", async (c) => {
  const id = c.req.param("id");
  const sharedDeck = await getSharedDeck(c.get("db"), id);

  if (!sharedDeck) {
    throw new HTTPException(404, { message: "Shared deck not found" });
  }

  return c.json({
    author_name: sharedDeck.author_name,
    data: JSON.parse(sharedDeck.data),
    history: JSON.parse(sharedDeck.history),
    listed: !!sharedDeck.listed,
  });
});

router.put(
  "/:id",
  // Generous: the client re-pushes a shared deck on every save.
  rateLimit({
    scope: "share-update",
    limit: 120,
    windowMs: SHARE_RATE_LIMIT_WINDOW_MS,
  }),
  optionalSessionAuth(),
  zodValidator("json", ShareRequestSchema),
  async (c) => {
    const id = c.req.param("id");
    const clientId = requireClientId(c.req.header("X-Client-Id"));
    const { history, listed, ...deck } = c.req.valid("json");

    if (deck.id.toString() !== id) {
      throw new HTTPException(400, {
        message: "Deck id does not match the share id",
      });
    }

    const account = c.get("account");

    if (listed && !account) {
      // Shares listed before this rule existed stay listed; the client
      // re-sends `listed` on every save, so only block new listings.
      const existing = await getSharedDeck(c.get("db"), id);
      if (existing && !existing.listed) throw loginRequiredToList();
    }

    const updated = await updateSharedDeck(
      c.get("db"),
      id,
      clientId,
      account?.id,
      JSON.stringify(deck),
      JSON.stringify(history),
      listed ? 1 : 0,
    );

    if (!updated) {
      const existing = await getSharedDeck(c.get("db"), id);
      throw new HTTPException(existing ? 403 : 404, {
        message: existing
          ? "You do not have permission to update this share"
          : "Shared deck not found",
      });
    }

    return c.json({ status: "ok" });
  },
);

router.delete("/:id", optionalSessionAuth(), async (c) => {
  const id = c.req.param("id");
  const clientId = requireClientId(c.req.header("X-Client-Id"));
  const account = c.get("account");

  const deleted = await deleteSharedDeck(
    c.get("db"),
    id,
    clientId,
    account?.id,
  );

  if (!deleted) {
    const existing = await getSharedDeck(c.get("db"), id);
    throw new HTTPException(existing ? 403 : 404, {
      message: existing
        ? "You do not have permission to delete this share"
        : "Shared deck not found",
    });
  }

  return c.json({ status: "ok" });
});

export default router;

function loginRequiredToList() {
  return new HTTPException(401, {
    message: "Log in to list decks in Deck Guides",
  });
}

function requireClientId(clientId: string | undefined) {
  if (!clientId) {
    throw new HTTPException(400, { message: "Missing X-Client-Id header" });
  }

  return clientId;
}
