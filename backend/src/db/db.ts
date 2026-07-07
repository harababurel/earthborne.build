import SQLiteDatabase from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import type { DB } from "./schema.types.ts";

export type Database = Kysely<DB>;

export function getDatabase(path: string): Database {
  const database = new SQLiteDatabase(path);
  database.pragma("foreign_keys = ON");

  return new Kysely<DB>({
    dialect: new SqliteDialect({
      database,
    }),
  });
}
