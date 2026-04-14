import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { Database } from "./db/db.ts";
import { getAppDataVersions } from "./db/queries/data-version.ts";
import { bodyLimitMiddleware } from "./lib/body-limit.ts";
import type { Config } from "./lib/config.ts";
import { corsMiddleware } from "./lib/cors.ts";
import { errorHandler } from "./lib/errors.ts";
import type { HonoEnv } from "./lib/hono-env.ts";
import { logger, requestLogger } from "./lib/logger.ts";
import adminRouter from "./routes/admin.ts";
import cardsRouter from "./routes/cards.ts";
import fanMadeProjectInfoRouter from "./routes/fan-made-project-info.ts";
import imagesRouter from "./routes/images.ts";
import packsRouter from "./routes/packs.ts";

export function appFactory(config: Config, database: Database) {
  const app = new Hono<HonoEnv>();

  app.use(secureHeaders());
  app.use(bodyLimitMiddleware());
  app.use(corsMiddleware(config));

  app.use(requestId());
  app.use(logger());
  app.use(requestLogger());

  app.use((c, next) => {
    c.set("db", database);
    c.set("config", config);
    return next();
  });

  app.route("/admin", adminRouter);
  app.route("/images", imagesRouter);

  const pub = new Hono<HonoEnv>();
  pub.route("/cards", cardsRouter);
  pub.route("/packs", packsRouter);
  pub.route("/fan-made-project-info", fanMadeProjectInfoRouter);
  app.route("/v2/public", pub);

  app.get("/up", (c) => c.text("ok"));

  app.get("/version", async (c) => {
    const dataVersions = await getAppDataVersions(c.get("db"));
    if (!dataVersions) throw new Error("could not infer data versions");
    return c.json(dataVersions);
  });

  app.onError(errorHandler);

  return app;
}
