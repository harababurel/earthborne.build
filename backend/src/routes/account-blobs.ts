import {
  AchievementsResponseSchema,
  AchievementsWriteRequestSchema,
  FolderResponseSchema,
  FolderWriteRequestSchema,
  SettingsResponseSchema,
  SettingsWriteRequestSchema,
} from "@earthborne-build/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  type BlobKind,
  getBlob,
  upsertBlob,
} from "../db/queries/revisioned-blobs.ts";
import { sessionAuth } from "../lib/auth/session-auth-middleware.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import { zodValidator } from "../lib/validation.ts";

const router = new Hono<HonoEnv>();

router.get("/folders", sessionAuth(), async (c) => {
  const row = await getBlob(c.get("db"), "folders", c.get("account").id);
  if (!row) throw new HTTPException(404, { message: "Folders not found" });

  return c.json(
    FolderResponseSchema.parse({
      state: JSON.parse(row.state),
      revision: row.revision,
    }),
  );
});

router.put(
  "/folders",
  sessionAuth(),
  zodValidator("json", FolderWriteRequestSchema),
  async (c) => {
    const { state, expectedRevision } = c.req.valid("json");
    return c.json(
      FolderResponseSchema.parse(
        await saveBlob(
          c,
          "folders",
          JSON.stringify(state),
          expectedRevision,
          "state",
        ),
      ),
    );
  },
);

router.get("/settings", sessionAuth(), async (c) => {
  const row = await getBlob(c.get("db"), "settings", c.get("account").id);
  if (!row) throw new HTTPException(404, { message: "Settings not found" });

  return c.json(
    SettingsResponseSchema.parse({
      settings: JSON.parse(row.settings),
      revision: row.revision,
    }),
  );
});

router.put(
  "/settings",
  sessionAuth(),
  zodValidator("json", SettingsWriteRequestSchema),
  async (c) => {
    const { settings, expectedRevision } = c.req.valid("json");
    return c.json(
      SettingsResponseSchema.parse(
        await saveBlob(
          c,
          "settings",
          JSON.stringify(settings),
          expectedRevision,
          "settings",
        ),
      ),
    );
  },
);

router.get("/achievements", sessionAuth(), async (c) => {
  const row = await getBlob(c.get("db"), "achievements", c.get("account").id);
  if (!row) throw new HTTPException(404, { message: "Achievements not found" });

  return c.json(
    AchievementsResponseSchema.parse({
      state: JSON.parse(row.state),
      revision: row.revision,
    }),
  );
});

router.put(
  "/achievements",
  sessionAuth(),
  zodValidator("json", AchievementsWriteRequestSchema),
  async (c) => {
    const { state, expectedRevision } = c.req.valid("json");
    return c.json(
      AchievementsResponseSchema.parse(
        await saveBlob(
          c,
          "achievements",
          JSON.stringify(state),
          expectedRevision,
          "state",
        ),
      ),
    );
  },
);

async function saveBlob(
  c: Context<HonoEnv>,
  kind: BlobKind,
  value: string,
  expectedRevision: string | null,
  valueKey: "settings" | "state",
) {
  const row = await upsertBlob(
    c.get("db"),
    kind,
    c.get("account").id,
    value,
    expectedRevision,
  );

  if (row) {
    return {
      [valueKey]: JSON.parse(row[valueKey]),
      revision: row.revision,
    };
  }

  const current = await getBlob(c.get("db"), kind, c.get("account").id);

  throw new HTTPException(409, {
    message: "Stored revision does not match the expected revision",
    cause: current
      ? {
          [valueKey]: JSON.parse(current[valueKey]),
          revision: current.revision,
        }
      : undefined,
  });
}

export default router;
