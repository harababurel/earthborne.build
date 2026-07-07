import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { Database } from "./db/db.ts";
import { getAppDataVersions } from "./db/queries/data-version.ts";
import { bodyLimitMiddleware } from "./lib/body-limit.ts";
import type { Config } from "./lib/config.ts";
import {
  authenticatedCorsMiddleware,
  publicCorsMiddleware,
} from "./lib/cors.ts";
import { type Mailer, mailerFromConfig } from "./lib/email/mailer.ts";
import { errorHandler } from "./lib/errors.ts";
import type { HonoEnv } from "./lib/hono-env.ts";
import { logger, requestLogger } from "./lib/logger.ts";
import accountBlobsRouter from "./routes/account-blobs.ts";
import accountCampaignsRouter from "./routes/account-campaigns.ts";
import accountDecksRouter from "./routes/account-decks.ts";
import accountSyncRouter from "./routes/account-sync.ts";
import adminRouter from "./routes/admin.ts";
import authRouter from "./routes/auth.ts";
import cardsRouter from "./routes/cards.ts";
import decklistsRouter from "./routes/decklists.ts";
import fanMadeProjectInfoRouter from "./routes/fan-made-project-info.ts";
import imagesRouter from "./routes/images.ts";
import packsRouter from "./routes/packs.ts";
import profileRouter from "./routes/profile.ts";
import setsRouter from "./routes/sets.ts";
import sharingRouter from "./routes/sharing.ts";

export function appFactory(
  config: Config,
  database: Database,
  mailer: Mailer = mailerFromConfig(config),
) {
  const app = new Hono<HonoEnv>();

  app.use(secureHeaders());
  app.use(bodyLimitMiddleware());

  app.use(requestId());
  app.use(logger());
  app.use(requestLogger());

  app.use((c, next) => {
    c.set("db", database);
    c.set("config", config);
    c.set("mailer", mailer);
    return next();
  });

  app.route("/admin", adminRouter);
  app.route("/images", imagesRouter);

  const pub = new Hono<HonoEnv>();
  pub.use("*", publicCorsMiddleware(config));
  pub.route("/cards", cardsRouter);
  pub.route("/packs", packsRouter);
  pub.route("/sets", setsRouter);
  pub.route("/fan-made-project-info", fanMadeProjectInfoRouter);
  pub.route("/share", sharingRouter);
  pub.route("/decklists", decklistsRouter);
  app.route("/v2/public", pub);

  const account = new Hono<HonoEnv>();
  account.use("*", authenticatedCorsMiddleware(config));
  account.route("/sync", accountSyncRouter);
  account.route("/decks", accountDecksRouter);
  account.route("/campaigns", accountCampaignsRouter);
  account.route("/", accountBlobsRouter);
  account.route("/auth", authRouter);
  account.route("/profile", profileRouter);
  app.route("/v2/account", account);

  app.get("/up", (c) => c.text("ok"));

  app.get("/version", async (c) => {
    const dataVersions = await getAppDataVersions(c.get("db"));
    if (!dataVersions) throw new Error("could not infer data versions");
    return c.json(dataVersions);
  });

  app.notFound((c) => {
    return c.json({ message: "Not Found" }, 404);
  });

  app.onError(errorHandler);

  return app;
}
