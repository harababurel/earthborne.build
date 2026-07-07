import { serve } from "@hono/node-server";
import { appFactory } from "./app.ts";
import { getDatabase } from "./db/db.ts";
import { cleanupExpiredTokens } from "./db/queries/auth/verification-tokens.ts";
import { cleanupExpiredSessions } from "./lib/auth/sessions.ts";
import { configSchema } from "./lib/config.ts";
import { mailerFromConfig } from "./lib/email/mailer.ts";
import { log } from "./lib/logger.ts";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const config = configSchema.parse(process.env);
const database = getDatabase(config.SQLITE_PATH);
const mailer = mailerFromConfig(config);

const app = appFactory(config, database, mailer);

void cleanupExpiredAccountState();
setInterval(() => {
  void cleanupExpiredAccountState();
}, CLEANUP_INTERVAL_MS).unref();

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

async function cleanupExpiredAccountState() {
  try {
    await cleanupExpiredSessions(database);
    await cleanupExpiredTokens(database);
  } catch (error) {
    log("error", "Failed to clean up expired account state", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
