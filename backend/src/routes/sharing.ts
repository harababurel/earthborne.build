import { DeckSchema } from "@earthborne-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  createSharedDeck,
  deleteSharedDeck,
  getSharedDeck,
  updateSharedDeck,
} from "../db/queries/sharing.ts";
import type { HonoEnv } from "../lib/hono-env.ts";

const router = new Hono<HonoEnv>();

router.post("/", async (c) => {
  const clientId = c.req.header("X-Client-Id");
  if (!clientId) {
    throw new HTTPException(400, { message: "Missing X-Client-Id header" });
  }

  const body = await c.req.json();
  const { history, ...deckData } = body;

  const result = DeckSchema.safeParse(deckData);
  if (!result.success) {
    throw new HTTPException(400, {
      message: "Invalid deck data",
      cause: result.error,
    });
  }

  await createSharedDeck(c.get("db"), {
    id: result.data.id.toString(),
    client_id: clientId,
    data: JSON.stringify(result.data),
    history: JSON.stringify(history ?? []),
  });

  return c.json({ status: "ok" });
});

router.get("/history/:id", async (c) => {
  const id = c.req.param("id");
  const sharedDeck = await getSharedDeck(c.get("db"), id);

  if (!sharedDeck) {
    throw new HTTPException(404, { message: "Shared deck not found" });
  }

  return c.json({
    data: JSON.parse(sharedDeck.data),
    history: JSON.parse(sharedDeck.history),
  });
});

router.put("/:id", async (c) => {
  const id = c.req.param("id");
  const clientId = c.req.header("X-Client-Id");
  if (!clientId) {
    throw new HTTPException(400, { message: "Missing X-Client-Id header" });
  }

  const body = await c.req.json();
  const { history, ...deckData } = body;

  const result = DeckSchema.safeParse(deckData);
  if (!result.success) {
    throw new HTTPException(400, {
      message: "Invalid deck data",
      cause: result.error,
    });
  }

  await updateSharedDeck(
    c.get("db"),
    id,
    clientId,
    JSON.stringify(result.data),
    JSON.stringify(history ?? []),
  );

  return c.json({ status: "ok" });
});

router.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const clientId = c.req.header("X-Client-Id");
  if (!clientId) {
    throw new HTTPException(400, { message: "Missing X-Client-Id header" });
  }

  await deleteSharedDeck(c.get("db"), id, clientId);

  return c.json({ status: "ok" });
});

export default router;
