import { FanMadeProjectInfoSchema } from "@earthborne-build/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  getAllFanMadeProjectInfos,
  getFanMadeProjectInfo,
} from "../db/queries/fan-made-project-info.ts";
import type { HonoEnv } from "../lib/hono-env.ts";

const router = new Hono<HonoEnv>();

router.get("/", async (c) => {
  const projects = await getAllFanMadeProjectInfos(c.get("db"));
  // One corrupt row should not take down the whole listing.
  const data = projects.flatMap((p) => {
    const parsed = parseProjectRow(p);
    if (!parsed) {
      c.get("logger")("error", "Skipping project with invalid meta", {
        id: p.id,
      });
    }
    return parsed ?? [];
  });
  return c.json({ data });
});

router.get("/:id", async (ctx) => {
  const project = await getFanMadeProjectInfo(
    ctx.get("db"),
    ctx.req.param("id"),
  );

  if (!project) {
    throw new HTTPException(404, { message: "Project not found." });
  }

  const parsed = parseProjectRow(project);

  if (!parsed) {
    throw new HTTPException(500, { message: "Project data is corrupt." });
  }

  return ctx.json(parsed);
});

function parseProjectRow(row: {
  id: string;
  bucket_path: string;
  meta: string;
}) {
  try {
    return FanMadeProjectInfoSchema.parse({
      ...row,
      meta: JSON.parse(row.meta),
    });
  } catch {
    return undefined;
  }
}

export default router;
