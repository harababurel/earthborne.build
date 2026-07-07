import { randomUUID } from "node:crypto";
import type { Database } from "../db.ts";

export type BlobKind = "folders" | "settings" | "achievements";

const blobConfig = {
  folders: {
    table: "account_folder",
    column: "state",
  },
  settings: {
    table: "account_settings",
    column: "settings",
  },
  achievements: {
    table: "account_achievements",
    column: "state",
  },
} as const;

export async function getBlob(db: Database, kind: BlobKind, accountId: string) {
  const config = blobConfig[kind];

  return await db
    .selectFrom(config.table)
    .select(["revision", config.column])
    .where("account_id", "=", accountId)
    .executeTakeFirst();
}

export async function upsertBlob(
  db: Database,
  kind: BlobKind,
  accountId: string,
  value: string,
  expectedRevision: string | null,
) {
  const config = blobConfig[kind];
  const revision = randomUUID();
  const values = {
    account_id: accountId,
    revision,
    [config.column]: value,
  };

  if (expectedRevision == null) {
    return await db
      .insertInto(config.table)
      .values(values)
      .onConflict((oc) => oc.column("account_id").doNothing())
      .returning(["revision", config.column])
      .executeTakeFirst();
  }

  return await db
    .insertInto(config.table)
    .values(values)
    .onConflict((oc) =>
      oc
        .column("account_id")
        .doUpdateSet({
          revision,
          [config.column]: value,
        })
        .where(`${config.table}.revision`, "=", expectedRevision),
    )
    .returning(["revision", config.column])
    .executeTakeFirst();
}
