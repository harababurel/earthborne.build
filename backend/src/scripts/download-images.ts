/**
 * Downloads card images from static.rangersdb.com and saves them locally.
 *
 * Usage:
 *   IMAGE_DIR=/path/to/earthborne.images/cards npm run download:images
 *
 * Images are fetched sequentially to avoid blasting the rangersdb CDN.
 * Already-downloaded images are skipped (safe to re-run as new cards are released).
 *
 * Not all card types have images on rangersdb — path cards, weather, missions,
 * locations, etc. are expected to be missing. 404s are logged and skipped.
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getDatabase } from "../db/db.ts";
import { log } from "../lib/logger.ts";

const IMAGE_DIR = process.env["IMAGE_DIR"];
if (!IMAGE_DIR) {
  log("error", "IMAGE_DIR env var is required");
  process.exit(1);
}

const FORCE = !!process.env["FORCE"];
const SQLITE_PATH = process.env["SQLITE_PATH"] ?? "./earthborne.db";
const RANGERSDB_IMAGE_BASE = "https://static.rangersdb.com/img/card";
const UPSTREAM_PACK_IDS: Record<string, string> = {
  ebr: "core",
};

const db = getDatabase(SQLITE_PATH);

try {
  await run();
  await db.destroy();
} catch (err) {
  log("error", "Download failed", { error: (err as Error).message });
  process.exit(1);
}

async function run() {
  const cards = await db
    .selectFrom("card")
    .select(["code", "pack_id", "image_rect"])
    .orderBy("code asc")
    .execute();

  log("info", `Found ${cards.length} cards`);

  let downloaded = 0;
  let skipped = 0;
  let missing = 0;
  let failed = 0;

  for (const card of cards) {
    const destDir = path.join(IMAGE_DIR as string, card.pack_id);
    const destFile = path.join(destDir, `${card.code}.jpg`);

    // Skip if already downloaded (unless FORCE is enabled)
    if (!FORCE && (await fileExists(destFile))) {
      skipped++;
      continue;
    }

    const upstreamPackId = getUpstreamPackId(card.pack_id);
    const url = `${RANGERSDB_IMAGE_BASE}/${upstreamPackId}/${card.code}.jpg`;

    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      log("warn", `Network error for ${card.code}`, {
        url,
        error: (err as Error).message,
      });
      failed++;
      continue;
    }

    if (res.status === 404) {
      log(
        "warn",
        `Image not found (expected for non-player cards): ${card.code}`,
        { url },
      );
      missing++;
      continue;
    }

    if (!res.ok) {
      log("warn", `Unexpected HTTP ${res.status} for ${card.code}`, { url });
      failed++;
      continue;
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    await fs.mkdir(destDir, { recursive: true });

    if (card.image_rect) {
      try {
        const [index, cols, rows] = JSON.parse(card.image_rect) as [
          number,
          number,
          number,
        ];
        const image = sharp(buffer);
        const { width: totalWidth, height: totalHeight } =
          await image.metadata();

        if (totalWidth && totalHeight) {
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

          downloaded++;
          log("info", `Cropped and saved ${card.code} from spritesheet`);
          continue;
        }
      } catch (err) {
        log("error", `Failed to crop ${card.code}`, {
          error: (err as Error).message,
        });
        failed++;
        continue;
      }
    }

    await fs.writeFile(destFile, buffer);
    downloaded++;
    log("info", `Downloaded ${card.code} (${buffer.length} bytes)`);
  }

  log("info", "Done", { downloaded, skipped, missing, failed });
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
