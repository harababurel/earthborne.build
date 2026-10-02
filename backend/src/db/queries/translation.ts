import type { Database } from "../db.ts";
import type { Translation } from "../schema.types.ts";

export type TranslationMap = Map<string, string>;

export function resolveLocale(locale?: string): string {
  return locale && ["en", "de", "es", "fr", "it", "ru"].includes(locale)
    ? locale
    : "en";
}

export async function getTranslations(
  db: Database,
  locale: string | undefined,
  entities: Translation["entity"][],
): Promise<TranslationMap> {
  const translations: TranslationMap = new Map();
  const resolved = resolveLocale(locale);
  if (resolved === "en") return translations;

  const rows = await db
    .selectFrom("translation")
    .select(["entity", "entity_id", "field", "value"])
    .where("locale", "=", resolved)
    .where("entity", "in", entities)
    .execute();

  for (const row of rows) {
    if (row.value) {
      translations.set(
        `${row.entity}.${row.entity_id}.${row.field}`,
        row.value,
      );
    }
  }
  return translations;
}
