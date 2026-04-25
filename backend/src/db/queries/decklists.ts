import type { DecklistSearchRequest } from "@earthborne-build/shared";
import { sql } from "kysely";
import type { Database } from "../db.ts";

export async function searchSharedDecks(
  db: Database,
  query: DecklistSearchRequest,
) {
  let q = db.selectFrom("shared_deck");

  if (query.name) {
    q = q.where(sql`json_extract(data, '$.name')`, "like", `%${query.name}%`);
  }
  if (query.role_code) {
    q = q.where(sql`json_extract(data, '$.role_code')`, "=", query.role_code);
  }
  if (query.background) {
    q = q.where(sql`json_extract(data, '$.background')`, "=", query.background);
  }
  if (query.specialty) {
    q = q.where(sql`json_extract(data, '$.specialty')`, "=", query.specialty);
  }
  if (query.tags) {
    q = q.where(sql`json_extract(data, '$.tags')`, "like", `%${query.tags}%`);
  }
  if (query.required && query.required.length > 0) {
    for (const req of query.required) {
      q = q.where(
        sql`json_extract(data, '$.slots.' || ${req})`,
        "is not",
        null,
      );
    }
  }
  if (query.excluded && query.excluded.length > 0) {
    for (const excl of query.excluded) {
      q = q.where(sql`json_extract(data, '$.slots.' || ${excl})`, "is", null);
    }
  }

  const offset = query.offset ?? 0;
  const limit = query.limit ?? 10;

  const [data, counts] = await Promise.all([
    q
      .selectAll()
      .orderBy("created_at", "desc")
      .offset(offset)
      .limit(limit)
      .execute(),
    q.select((eb) => eb.fn.count<number>("id").as("total")).execute(),
  ]);

  const total = counts[0]?.total ?? 0;

  return {
    data: data.map((d) => ({
      id: d.id,
      created_at: d.created_at,
      ...JSON.parse(d.data),
    })),
    total,
  };
}
