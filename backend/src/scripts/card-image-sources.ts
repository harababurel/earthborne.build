import fs from "node:fs/promises";
import path from "node:path";

export type RawCardImageFields = {
  imagesrc?: string;
  image_rect?: number[];
  back_imagesrc?: string;
  back_image_rect?: number[];
};

export type BackImageSource = {
  imagesrc: string;
  image_rect?: number[];
};

type TtsBackSource = {
  imagesrc: string;
  cols: number;
  rows: number;
};

export async function loadTtsUniqueBackImageSources(dataDir: string) {
  const filePath = path.join(dataDir, "Earthborne_Rangers.json");

  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch {
    return new Map<string, TtsBackSource>();
  }

  const data = JSON.parse(raw) as unknown;
  const customDecks: Record<string, unknown>[] = [];
  collectCustomDecks(data, customDecks);

  const sources = new Map<string, TtsBackSource>();
  for (const customDeck of customDecks) {
    for (const value of Object.values(customDeck)) {
      const entry = asRecord(value);
      if (!entry || entry["UniqueBack"] !== true) continue;

      const faceUrl = entry["FaceURL"];
      const backUrl = entry["BackURL"];
      const cols = entry["NumWidth"];
      const rows = entry["NumHeight"];

      if (
        typeof faceUrl !== "string" ||
        typeof backUrl !== "string" ||
        typeof cols !== "number" ||
        typeof rows !== "number"
      ) {
        continue;
      }

      sources.set(normalizeImageUrl(faceUrl), {
        imagesrc: backUrl,
        cols,
        rows,
      });
    }
  }

  return sources;
}

export function inferBackImageSource(
  card: RawCardImageFields,
  sources: Map<string, TtsBackSource>,
): BackImageSource | undefined {
  const imageRect = card.back_image_rect ?? card.image_rect;

  if (card.back_imagesrc) {
    const source: BackImageSource = { imagesrc: card.back_imagesrc };
    if (imageRect) source.image_rect = imageRect;
    return source;
  }

  if (!card.imagesrc || !imageRect) return undefined;

  const source = sources.get(normalizeImageUrl(card.imagesrc));
  if (!source) return undefined;

  const [index, cols, rows] = imageRect as [number, number, number];
  if (cols !== source.cols || rows !== source.rows) return undefined;

  return {
    imagesrc: source.imagesrc,
    image_rect: [index, cols, rows],
  };
}

function collectCustomDecks(
  value: unknown,
  customDecks: Record<string, unknown>[],
) {
  if (Array.isArray(value)) {
    for (const child of value) collectCustomDecks(child, customDecks);
    return;
  }

  const record = asRecord(value);
  if (!record) return;

  const customDeck = asRecord(record["CustomDeck"]);
  if (customDeck) customDecks.push(customDeck);

  for (const child of Object.values(record)) {
    collectCustomDecks(child, customDecks);
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function normalizeImageUrl(value: string) {
  return value.trim();
}
