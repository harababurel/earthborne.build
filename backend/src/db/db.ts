import SQLiteDatabase from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import type { DB } from "./schema.types.ts";

export type Database = Kysely<DB>;

export function getDatabase(path: string): Database {
  return new Kysely<DB>({
    dialect: new SqliteDialect({
      database: new SQLiteDatabase(path),
    }),
  });
}
