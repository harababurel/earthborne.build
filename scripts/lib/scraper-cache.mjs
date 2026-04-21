// biome-ignore-all lint/suspicious/noConsole: scraper cache output.

import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

/**
 * @typedef {Object} ScraperCache
 * @property {(url: string) => Promise<{ body: string, meta: object } | null>} read
 * @property {(url: string, body: string, meta: object) => Promise<void>} write
 * @property {() => Promise<void>} clear
 * @property {() => { hits: number, misses: number, errors: number, refreshes: number, bypasses: number }} stats
 * @property {string} dir
 * @property {"auto" | "refresh" | "offline" | "bypass"} mode
 */

/**
 * @param {{ dir: string, mode: "auto" | "refresh" | "offline" | "bypass" }} options
 * @returns {ScraperCache}
 */
export function createCache({ dir, mode }) {
  const stats = { hits: 0, misses: 0, errors: 0, refreshes: 0, bypasses: 0 };

  const getPaths = (url) => {
    const hash = crypto
      .createHash("sha256")
      .update(url)
      .digest("hex")
      .slice(0, 32);
    const shard = hash.slice(0, 2);
    const shardDir = path.join(dir, shard);
    const bodyPath = path.join(shardDir, `${hash}.body.html`);
    const metaPath = path.join(shardDir, `${hash}.meta.json`);
    return { shardDir, bodyPath, metaPath };
  };

  return {
    dir,
    mode,
    stats: () => stats,
    async read(url) {
      const { bodyPath, metaPath } = getPaths(url);
      try {
        const metaStr = await fs.readFile(metaPath, "utf-8");
        const meta = JSON.parse(metaStr);
        const body = await fs.readFile(bodyPath, "utf-8");
        return { body, meta };
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.warn(
            `[Cache Warning] Failed to read valid cache entry for ${url}: ${err.message}`,
          );
        }
        return null;
      }
    },
    async write(url, body, meta) {
      const { shardDir, bodyPath, metaPath } = getPaths(url);
      await fs.mkdir(shardDir, { recursive: true });

      const tmpBodyPath = `${bodyPath}.tmp`;
      const tmpMetaPath = `${metaPath}.tmp`;

      await fs.writeFile(tmpBodyPath, body, "utf-8");
      await fs.writeFile(tmpMetaPath, JSON.stringify(meta, null, 2), "utf-8");

      await fs.rename(tmpBodyPath, bodyPath);
      await fs.rename(tmpMetaPath, metaPath);
    },
    async clear() {
      await fs.rm(dir, { recursive: true, force: true });
      await fs.mkdir(dir, { recursive: true });
    },
  };
}

/**
 * Fetch a URL with caching according to the cache's mode. Handles retries
 * on network errors. Returns the response body as text.
 *
 * Throws on offline-miss, on non-2xx responses after all retries, and on
 * persistent network errors.
 *
 * @param {string} url
 * @param {{
 *   cache: ScraperCache,
 *   retries?: number,
 *   timeoutMs?: number,
 *   headers?: Record<string, string>,
 * }} options
 * @returns {Promise<{ body: string, fromCache: boolean, status: number }>}
 */
export async function cachedFetchText(url, options) {
  const { cache, retries = 3, timeoutMs = 15000, headers = {} } = options;

  if (cache.mode === "auto" || cache.mode === "offline") {
    const cached = await cache.read(url);
    if (cached) {
      cache.stats().hits++;
      return { body: cached.body, fromCache: true, status: cached.meta.status };
    }
  }

  if (cache.mode === "offline") {
    cache.stats().errors++;
    throw new Error(`Cache miss for ${url} (offline mode)`);
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }

      const body = await res.text();
      const status = res.status;

      if (cache.mode === "auto" || cache.mode === "refresh") {
        const meta = {
          url,
          status,
          contentType:
            res.headers.get("content-type") || "text/html; charset=utf-8",
          fetchedAt: new Date().toISOString(),
          bodyBytes: Buffer.byteLength(body, "utf8"),
        };
        await cache.write(url, body, meta);
        if (cache.mode === "auto") {
          cache.stats().misses++;
        } else {
          cache.stats().refreshes++;
        }
      } else if (cache.mode === "bypass") {
        cache.stats().bypasses++;
      }

      return { body, fromCache: false, status };
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Failed to fetch ${url}`);
}

/**
 * Parse cache-control flags from process.argv. Mutates argv to remove
 * recognized flags so existing scripts can still read their own args
 * (currently neither script reads argv, but this keeps the door open).
 *
 * @returns {{
 *   mode: "auto" | "refresh" | "offline" | "bypass",
 *   dir: string,
 *   clear: boolean,
 * }}
 */
export function parseCacheArgs(argv = process.argv.slice(2)) {
  let mode = "auto";
  let dir =
    process.env.SCRAPER_CACHE_DIR || path.join(repoRoot, ".cache", "scraper");
  let clear = false;

  let modeShortcutCount = 0;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--cache-mode") {
      mode = argv[i + 1];
      if (!["auto", "refresh", "offline", "bypass"].includes(mode)) {
        throw new Error(`Invalid --cache-mode: ${mode}`);
      }
      argv.splice(i, 2);
      i--;
    } else if (arg === "--refresh") {
      mode = "refresh";
      modeShortcutCount++;
      argv.splice(i, 1);
      i--;
    } else if (arg === "--offline") {
      mode = "offline";
      modeShortcutCount++;
      argv.splice(i, 1);
      i--;
    } else if (arg === "--no-cache") {
      mode = "bypass";
      modeShortcutCount++;
      argv.splice(i, 1);
      i--;
    } else if (arg === "--clear-cache") {
      clear = true;
      argv.splice(i, 1);
      i--;
    } else if (arg === "--cache-dir") {
      dir = argv[i + 1];
      argv.splice(i, 2);
      i--;
    }
  }

  if (modeShortcutCount > 1) {
    throw new Error("Conflicting cache mode shortcuts provided.");
  }

  return { mode, dir, clear };
}
