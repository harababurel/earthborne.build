import fs from "node:fs";
import path from "node:path";
import { sql } from "kysely";
import type { Database } from "./db.ts";

/**
 * Applies all SQL files in the specified folder to the database.
 * Splits statements on semicolons for SQLite compatibility.
 * TESTING and SCRIPTS use only.
 */
export async function applySqlFiles(db: Database, pathToFolder: string) {
  const folderPath = path.join(import.meta.dirname, pathToFolder);
  const folder = await fs.promises.readdir(folderPath);

  for (const fileName of folder) {
    if (!fileName.endsWith(".sql")) continue;
    const filePath = path.join(folderPath, fileName);
    let sqlText = await fs.promises.readFile(filePath, "utf-8");

    if (sqlText.includes("-- migrate:up")) {
      sqlText = sqlText.split("-- migrate:down")[0] ?? "";
      sqlText = sqlText.replace("-- migrate:up", "");
    }

    const statements = sqlText
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      await db.executeQuery(sql.raw(statement).compile(db));
    }
  }
}
