import { SyncManifestResponseSchema } from "@earthborne-build/shared";
import { Hono } from "hono";
import { listCampaignManifest } from "../db/queries/account-campaigns.ts";
import { listDeckManifest } from "../db/queries/account-decks.ts";
import { sessionAuth } from "../lib/auth/session-auth-middleware.ts";
import type { HonoEnv } from "../lib/hono-env.ts";

const router = new Hono<HonoEnv>();

router.get("/manifest", sessionAuth(), async (c) => {
  const accountId = c.get("account").id;
  const [decks, campaigns] = await Promise.all([
    listDeckManifest(c.get("db"), accountId),
    listCampaignManifest(c.get("db"), accountId),
  ]);

  return c.json(
    SyncManifestResponseSchema.parse({
      decks: decks.map((item) => ({
        id: item.id,
        revision: item.revision,
        updatedAt: item.updated_at,
      })),
      campaigns: campaigns.map((item) => ({
        id: item.id,
        revision: item.revision,
        updatedAt: item.updated_at,
      })),
    }),
  );
});

export default router;
