import type { DecklistSearchRequest } from "@earthborne-build/shared";
import { sql } from "kysely";
import type { Database } from "../db.ts";

export async function searchSharedDecks(
  db: Database,
  query: DecklistSearchRequest,
) {
  let q = db
    .selectFrom("shared_deck")
    .leftJoin("account", "account.id", "shared_deck.account_id");

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
      q = q.where(sql`json_extract(data, ${`$.slots.${req}`})`, "is not", null);
    }
  }
  if (query.excluded && query.excluded.length > 0) {
    for (const excl of query.excluded) {
      q = q.where(sql`json_extract(data, ${`$.slots.${excl}`})`, "is", null);
    }
  }

  const offset = query.offset ?? 0;
  const limit = query.limit ?? 10;

  const [data, counts] = await Promise.all([
    q
      .select([
        "shared_deck.id",
        "shared_deck.client_id",
        "shared_deck.account_id",
        "shared_deck.data",
        "shared_deck.history",
        "shared_deck.created_at",
        "shared_deck.updated_at",
        sql<
          string | null
        >`case when account.profile_completed_at is not null then account.name else null end`.as(
          "author_name",
        ),
      ])
      .orderBy("shared_deck.created_at", "desc")
      .offset(offset)
      .limit(limit)
      .execute(),
    q
      .select((eb) => eb.fn.count<number>("shared_deck.id").as("total"))
      .execute(),
  ]);

  const total = counts[0]?.total ?? 0;

  return {
    data: data.map((d) => ({
      id: d.id,
      created_at: d.created_at,
      author_name: d.author_name,
      ...JSON.parse(d.data),
    })),
    total,
  };
}
