import fs from "node:fs/promises";
import path from "node:path";
import type { Translation } from "../db/schema.types.ts";
import { normalizeTranslationText, parsePo } from "./po-parser.ts";

type Entity = Translation["entity"];
type Source = { id: string } & Record<string, unknown>;
export type TranslationSources = Record<Entity, Source[]>;

const LOCALES = ["de", "es", "fr", "it", "ru"];
const FIELDS: Record<Entity, string[]> = {
  card: [
    "name",
    "text",
    "traits",
    "flavor",
    "sun_challenge",
    "mountain_challenge",
    "crest_challenge",
  ],
  pack: ["name", "short_name"],
  set: ["name"],
  subset: ["name"],
  token: ["name", "plurals"],
  type: ["name"],
  aspect: ["name", "short_name"],
  area: ["name"],
};
const FILE_ENTITIES: Record<string, Entity> = {
  "packs.po": "pack",
  "sets.po": "set",
  "subsets.po": "subset",
  "tokens.po": "token",
  "types.po": "type",
  "aspects.po": "aspect",
  "areas.po": "area",
};
const AREA_ID_REMAP: Record<string, string> = {
  play: "in_play",
  reach: "within_reach",
  along: "along_the_way",
};

export async function loadCardTranslations(
  dataDir: string,
  sources: TranslationSources,
  report: (message: string) => void,
) {
  const sourceMaps = new Map<Entity, Map<string, Source>>();
  let availableFields = 0;
  for (const entity of Object.keys(FIELDS) as Entity[]) {
    sourceMaps.set(entity, new Map(sources[entity].map((s) => [s.id, s])));
    for (const source of sourceMaps.get(entity)?.values() ?? []) {
      availableFields += FIELDS[entity].filter(
        (field) => typeof source[field] === "string" && source[field] !== "",
      ).length;
    }
  }

  const rows: Translation[] = [];
  for (const locale of LOCALES) {
    const localeDir = path.join(dataDir, "i18n", locale);
    const files = await poFiles(localeDir);
    const seen = new Set<string>();
    let outdated = 0;
    let ignored = 0;
    const start = rows.length;
    const cards = new Set<string>();
    for (const file of files) {
      const relative = path.relative(localeDir, file);
      const entity = relative.startsWith(`packs${path.sep}`)
        ? "card"
        : FILE_ENTITIES[relative];
      if (!entity) continue;
      const entries = parsePo(await fs.readFile(file, "utf8"), (warning) =>
        report(`${locale}/${relative}: ${warning}`),
      );
      for (const entry of entries) {
        const id =
          entity === "pack" && entry.id === "core"
            ? "ebr"
            : entity === "area"
              ? (AREA_ID_REMAP[entry.id] ?? entry.id)
              : entry.id;
        const source = sourceMaps.get(entity)?.get(id);
        if (!source || !FIELDS[entity].includes(entry.field)) {
          ignored++;
          continue;
        }
        const key = `${entity}.${id}.${entry.field}`;
        if (seen.has(key)) {
          report(
            `${locale}/${relative}: Duplicate translation '${key}'; keeping the first entry`,
          );
          continue;
        }
        seen.add(key);
        const english = source[entry.field];
        if (
          normalizeTranslationText(
            typeof english === "string" ? english : "",
          ) !== normalizeTranslationText(entry.source)
        ) {
          outdated++;
        }
        rows.push({
          locale,
          entity,
          entity_id: id,
          field: entry.field,
          value: normalizeTranslationText(entry.value),
        });
        if (entity === "card") cards.add(id);
      }
    }
    report(
      `Translation coverage ${locale}: ${rows.length - start}/${availableFields} fields, ${cards.size}/${sources.card.length} cards; ${outdated} outdated sources (retained), ${ignored} ignored entries`,
    );
  }
  return rows;
}

async function poFiles(directory: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(directory);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return [];
    throw error;
  }
  const files: string[] = [];
  for (const entry of entries.sort()) {
    if (entry === "taboos") continue;
    const file = path.join(directory, entry);
    if ((await fs.stat(file)).isDirectory())
      files.push(...(await poFiles(file)));
    else if (file.endsWith(".po")) files.push(file);
  }
  return files;
}
