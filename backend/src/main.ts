import { serve } from "@hono/node-server";
import { appFactory } from "./app.ts";
import { getDatabase } from "./db/db.ts";
import { configSchema } from "./lib/config.ts";
import { mailerFromConfig } from "./lib/email/mailer.ts";
import { log } from "./lib/logger.ts";

const config = configSchema.parse(process.env);
const database = getDatabase(config.SQLITE_PATH);
const mailer = mailerFromConfig(config);

const app = appFactory(config, database, mailer);

serve(
  {
    fetch: app.fetch,
    hostname: config.HOSTNAME,
    port: config.PORT,
  },
  (info) => {
    log("info", "Application started", {
      address: info.address,
      port: info.port,
    });
  },
);
