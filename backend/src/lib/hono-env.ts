import type { Database } from "../db/db.ts";
import type { Config } from "./config.ts";
import type { Mailer } from "./email/mailer.ts";
import type { Logger } from "./logger.ts";

export type HonoEnv = {
  Variables: {
    config: Config;
    db: Database;
    logger: Logger;
    mailer: Mailer;
  };
};
