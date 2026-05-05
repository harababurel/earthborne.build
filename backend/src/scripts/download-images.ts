/**
 * Downloads card images from static.rangersdb.com (or a card's custom imagesrc)
 * and saves them locally.
 *
 * Usage:
 *   CARD_DATA_DIR=/path/to/rangers-card-data IMAGE_DIR=/path/to/earthborne.images/cards npm run download:images
 *
 * Images are fetched sequentially to avoid blasting the rangersdb CDN.
 * Already-downloaded images are skipped (safe to re-run as new cards are released).
 *
 * Some cards define custom front/back spritesheet coordinates in
 * rangers-card-data. Those entries are cropped locally.
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { log } from "../lib/logger.ts";
import {
  inferBackImageSource,
  loadTtsUniqueBackImageSources,
} from "./card-image-sources.ts";

const CARD_DATA_DIR = process.env["CARD_DATA_DIR"];
if (!CARD_DATA_DIR) {
  log("error", "CARD_DATA_DIR env var is required");
  process.exit(1);
}

const IMAGE_DIR = process.env["IMAGE_DIR"];
if (!IMAGE_DIR) {
  log("error", "IMAGE_DIR env var is required");
  process.exit(1);
}

const FORCE = !!process.env["FORCE"];
const RANGERSDB_IMAGE_BASE = "https://static.rangersdb.com/img/card";
const UPSTREAM_PACK_IDS: Record<string, string> = {
  ebr: "core",
};
const PACK_ID_REMAP: Record<string, string> = {
  core: "ebr",
};

type RawCard = {
  id: string;
  imagesrc?: string;
  image_rect?: number[];
  back_imagesrc?: string;
  back_image_rect?: number[];
};

type CardEntry = {
  code: string;
  packId: string;
  imagesrc?: string;
  image_rect?: number[];
};

try {
  await run();
} catch (err) {
  log("error", "Download failed", { error: (err as Error).message });
  process.exit(1);
}

async function run() {
  const cards = await loadCardEntries(CARD_DATA_DIR as string);
  log("info", `Found ${cards.length} cards`);

  let downloaded = 0;
  let skipped = 0;
  let missing = 0;
  let failed = 0;

  for (const card of cards) {
    const result = await downloadCardImage(card);
    if (result === "downloaded") {
      downloaded++;
    } else if (result === "skipped") {
      skipped++;
    } else if (result === "missing") {
      missing++;
    } else {
      failed++;
    }
  }

  log("info", "Done", { downloaded, skipped, missing, failed });
}

async function downloadCardImage(
  card: CardEntry,
): Promise<"downloaded" | "skipped" | "missing" | "failed"> {
  const destDir = path.join(IMAGE_DIR as string, card.packId);
  const destFile = path.join(destDir, `${card.code}.jpg`);

  if (!FORCE && (await fileExists(destFile))) return "skipped";

  const upstreamPackId = getUpstreamPackId(card.packId);
  const url = card.imagesrc?.startsWith("http")
    ? card.imagesrc
    : `${RANGERSDB_IMAGE_BASE}/${upstreamPackId}/${card.code}.jpg`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    log("warn", `Network error for ${card.code}`, {
      url,
      error: (err as Error).message,
    });
    return "failed";
  }

  if (res.status === 404) {
    log("warn", `Image not found: ${card.code}`, { url });
    return "missing";
  }

  if (!res.ok) {
    log("warn", `Unexpected HTTP ${res.status} for ${card.code}`, { url });
    return "failed";
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  await fs.mkdir(destDir, { recursive: true });

  if (card.image_rect) {
    try {
      await cropSpritesheetImage(buffer, card.image_rect, destFile);
      log("info", `Cropped and saved ${card.code} from spritesheet`);
      return "downloaded";
    } catch (err) {
      log("error", `Failed to crop ${card.code}`, {
        error: (err as Error).message,
      });
      return "failed";
    }
  }

  await fs.writeFile(destFile, buffer);
  log("info", `Downloaded ${card.code} (${buffer.length} bytes)`);
  return "downloaded";
}

async function cropSpritesheetImage(
  buffer: Buffer,
  imageRect: number[],
  destFile: string,
) {
  const [index, cols, rows] = imageRect as [number, number, number];
  const image = sharp(buffer);
  const { width: totalWidth, height: totalHeight } = await image.metadata();

  if (!totalWidth || !totalHeight) {
    throw new Error("Spritesheet dimensions are unavailable.");
  }

  const colIndex = index % cols;
  const rowIndex = Math.floor(index / cols);

  const left = Math.round((colIndex * totalWidth) / cols);
  const top = Math.round((rowIndex * totalHeight) / rows);
  const right = Math.round(((colIndex + 1) * totalWidth) / cols);
  const bottom = Math.round(((rowIndex + 1) * totalHeight) / rows);

  const width = right - left;
  const height = bottom - top;

  await image
    .extract({ left, top, width, height })
    .toFormat("jpeg")
    .toFile(destFile);
}

async function loadCardEntries(dataDir: string): Promise<CardEntry[]> {
  const entries: CardEntry[] = [];
  const backImageSources = await loadTtsUniqueBackImageSources(dataDir);
  const packDirs = await fs.readdir(path.join(dataDir, "packs"));

  for (const packId of packDirs) {
    const packDirPath = path.join(dataDir, "packs", packId);
    const stats = await fs.stat(packDirPath);
    if (!stats.isDirectory()) continue;

    const remappedPackId = PACK_ID_REMAP[packId] ?? packId;
    const files = (await fs.readdir(packDirPath)).sort();

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const raw = await fs.readFile(path.join(packDirPath, file), "utf-8");
      const cards = JSON.parse(raw) as RawCard[];
      for (const c of cards) {
        const entry: CardEntry = { code: c.id, packId: remappedPackId };
        if (c.imagesrc) entry.imagesrc = c.imagesrc;
        if (c.image_rect) entry.image_rect = c.image_rect;
        entries.push(entry);

        const backImageSource = inferBackImageSource(c, backImageSources);
        if (backImageSource) {
          const backEntry: CardEntry = {
            code: `${c.id}b`,
            packId: remappedPackId,
          };
          backEntry.imagesrc = backImageSource.imagesrc;
          if (backImageSource.image_rect) {
            backEntry.image_rect = backImageSource.image_rect;
          }
          entries.push(backEntry);
        }
      }
    }
  }

  entries.sort((a, b) => a.code.localeCompare(b.code));
  return entries;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getUpstreamPackId(packId: string) {
  return UPSTREAM_PACK_IDS[packId] ?? packId;
}
