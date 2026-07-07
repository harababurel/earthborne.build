import {
  DeckBatchResponseSchema,
  DeckConflictResponseSchema,
  DeckCreateRequestSchema,
  DeckWriteRequestSchema,
  ItemBatchRequestSchema,
  ItemDeleteRequestSchema,
  WriteResponseSchema,
} from "@earthborne-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  deleteDeckItem,
  getDeckBatch,
  getDeckItem,
  insertDeckItem,
  isUniqueConstraintError,
  updateDeckItem,
} from "../db/queries/account-decks.ts";
import { sessionAuth } from "../lib/auth/session-auth-middleware.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import { assertSyncItemSize } from "../lib/sync/size-limits.ts";
import { zodValidator } from "../lib/validation.ts";

const router = new Hono<HonoEnv>();

router.post(
  "/batch",
  sessionAuth(),
  zodValidator("json", ItemBatchRequestSchema),
  async (c) => {
    const { ids } = c.req.valid("json");
    const rows = await getDeckBatch(c.get("db"), c.get("account").id, ids);

    return c.json(
      DeckBatchResponseSchema.parse({
        decks: rows.map((row) => ({
          data: JSON.parse(row.data),
          revision: row.revision,
          updatedAt: row.updated_at,
        })),
      }),
    );
  },
);

router.post(
  "/",
  sessionAuth(),
  zodValidator("json", DeckCreateRequestSchema),
  async (c) => {
    const { data } = c.req.valid("json");

    try {
      const row = await insertDeckItem(
        c.get("db"),
        c.get("account").id,
        String(data.id),
        serializeDeck(data),
      );

      c.status(201);
      return c.json(WriteResponseSchema.parse({ revision: row.revision }));
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new HTTPException(409, { message: "Deck id already exists" });
      }

      throw error;
    }
  },
);

router.put(
  "/:id",
  sessionAuth(),
  zodValidator("json", DeckWriteRequestSchema),
  async (c) => {
    const id = c.req.param("id");
    const { data, expectedRevision } = c.req.valid("json");
    const accountId = c.get("account").id;

    if (String(data.id) !== id) {
      throw new HTTPException(400, {
        message: "Deck id must match the request URL",
      });
    }

    const row = await updateDeckItem(
      c.get("db"),
      accountId,
      id,
      serializeDeck(data),
      expectedRevision,
    );

    if (row) {
      return c.json(WriteResponseSchema.parse({ revision: row.revision }));
    }

    const current = await getDeckItem(c.get("db"), accountId, id);
    if (!current) {
      throw new HTTPException(404, { message: "Deck not found" });
    }

    throw new HTTPException(409, {
      message: "Stored deck revision does not match the expected revision",
      cause: DeckConflictResponseSchema.parse({
        data: JSON.parse(current.data),
        revision: current.revision,
      }),
    });
  },
);

router.delete(
  "/:id",
  sessionAuth(),
  zodValidator("json", ItemDeleteRequestSchema),
  async (c) => {
    const id = c.req.param("id");
    const { expectedRevision } = c.req.valid("json");
    const accountId = c.get("account").id;

    if (await deleteDeckItem(c.get("db"), accountId, id, expectedRevision)) {
      return c.json({ status: "ok" });
    }

    const current = await getDeckItem(c.get("db"), accountId, id);
    if (!current) {
      throw new HTTPException(404, { message: "Deck not found" });
    }

    throw new HTTPException(409, {
      message: "Stored deck revision does not match the expected revision",
      cause: DeckConflictResponseSchema.parse({
        data: JSON.parse(current.data),
        revision: current.revision,
      }),
    });
  },
);

function serializeDeck(data: unknown) {
  const serialized = JSON.stringify(data);
  assertSyncItemSize(serialized, "Deck");
  return serialized;
}

export default router;
