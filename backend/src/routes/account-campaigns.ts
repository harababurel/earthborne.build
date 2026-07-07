import {
  CampaignBatchResponseSchema,
  CampaignConflictResponseSchema,
  CampaignCreateRequestSchema,
  CampaignWriteRequestSchema,
  ItemBatchRequestSchema,
  ItemDeleteRequestSchema,
  WriteResponseSchema,
} from "@earthborne-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  deleteCampaignItem,
  getCampaignBatch,
  getCampaignItem,
  insertCampaignItem,
  updateCampaignItem,
} from "../db/queries/account-campaigns.ts";
import { isUniqueConstraintError } from "../db/queries/account-decks.ts";
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
    const rows = await getCampaignBatch(c.get("db"), c.get("account").id, ids);

    return c.json(
      CampaignBatchResponseSchema.parse({
        campaigns: rows.map((row) => ({
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
  zodValidator("json", CampaignCreateRequestSchema),
  async (c) => {
    const { data } = c.req.valid("json");

    try {
      const row = await insertCampaignItem(
        c.get("db"),
        c.get("account").id,
        String(data.id),
        serializeCampaign(data),
      );

      c.status(201);
      return c.json(WriteResponseSchema.parse({ revision: row.revision }));
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new HTTPException(409, { message: "Campaign id already exists" });
      }

      throw error;
    }
  },
);

router.put(
  "/:id",
  sessionAuth(),
  zodValidator("json", CampaignWriteRequestSchema),
  async (c) => {
    const id = c.req.param("id");
    const { data, expectedRevision } = c.req.valid("json");
    const accountId = c.get("account").id;

    if (String(data.id) !== id) {
      throw new HTTPException(400, {
        message: "Campaign id must match the request URL",
      });
    }

    const row = await updateCampaignItem(
      c.get("db"),
      accountId,
      id,
      serializeCampaign(data),
      expectedRevision,
    );

    if (row) {
      return c.json(WriteResponseSchema.parse({ revision: row.revision }));
    }

    const current = await getCampaignItem(c.get("db"), accountId, id);
    if (!current) {
      throw new HTTPException(404, { message: "Campaign not found" });
    }

    throw new HTTPException(409, {
      message: "Stored campaign revision does not match the expected revision",
      cause: CampaignConflictResponseSchema.parse({
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

    if (
      await deleteCampaignItem(c.get("db"), accountId, id, expectedRevision)
    ) {
      return c.json({ status: "ok" });
    }

    const current = await getCampaignItem(c.get("db"), accountId, id);
    if (!current) {
      throw new HTTPException(404, { message: "Campaign not found" });
    }

    throw new HTTPException(409, {
      message: "Stored campaign revision does not match the expected revision",
      cause: CampaignConflictResponseSchema.parse({
        data: JSON.parse(current.data),
        revision: current.revision,
      }),
    });
  },
);

function serializeCampaign(data: unknown) {
  const serialized = JSON.stringify(data);
  assertSyncItemSize(serialized, "Campaign");
  return serialized;
}

export default router;
