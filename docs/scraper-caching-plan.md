# Scraper Caching — Implementation Plan

## Audience

This plan is written for an autonomous coding agent (e.g. Gemini CLI) that will execute it from start to finish without further clarification. Read the entire document before writing any code. Where the plan says "do X", it means "do exactly X" — do not improvise the design, but do feel free to improve naming or local style if it fits the surrounding code.

## Background

Two scraper scripts under `scripts/` fetch HTML from the official Living Valley reference site and transform it into HTML assets shipped under `frontend/src/assets/`:

- `scripts/scrape-rules.mjs` — fetches a fixed list of ~140 rules-glossary entries (one HTTP request per slug, sequential, with a 150 ms politeness delay).
- `scripts/scrape-reference-sections.mjs` — crawls four sections (Campaign Guides, One-Day Missions, Updates, FAQ) by discovering links, with concurrency 6. Campaign Guides alone is ~983 pages.

Both scripts perform their network I/O through a single chokepoint:

- `fetchEntry(letter, slug, retries = 3)` in `scripts/scrape-rules.mjs` (lines 302–323).
- `fetchPage(path, retries = 3)` in `scripts/scrape-reference-sections.mjs` (lines 635–662).

Every other transformation (sanitization, icon replacement, TOC building, output writing) is purely local CPU work and runs in well under a second per page.

The pain point: when transformation logic changes (e.g. mapping a new PUA codepoint to a `core-*` icon span), the entire crawl has to run again. This is slow and unfriendly to the upstream server.

## Goal

Add a shared file-based HTTP cache used by both scrapers so that:

1. The first run populates the cache by fetching everything from the network as today.
2. Subsequent runs read raw HTML from the cache and skip all network requests, while still re-running the transformation pipeline on the cached HTML.
3. The user can override behavior with explicit flags (force re-fetch, run offline, clear cache, point cache somewhere else).
4. The cache is never committed to the repo.

## Non-goals

- Do not parallelize or otherwise restructure the scrapers beyond what the cache requires.
- Do not change the format of the generated HTML output (`frontend/src/assets/*.html`). Running the cached scraper must produce byte-identical output to running the live scraper against the same upstream content.
- Do not cache transformed output. The cache stores raw upstream responses only — that is the whole point: changing transformation logic must not require a re-fetch.
- Do not introduce new runtime dependencies beyond the existing `node-html-parser`. Use only Node built-ins (`node:fs/promises`, `node:path`, `node:crypto`, `node:url`).
- Do not add a TTL/expiry feature. Cache invalidation is manual (`--refresh` or `--clear-cache`). Keep it simple.

## High-level design

### Storage

- **Location**: `<repo-root>/.cache/scraper/` by default. Project-local because:
  - Easy for the user to inspect (`ls .cache/scraper/`) and nuke (`rm -rf .cache/scraper`).
  - Survives across reboots (unlike `/tmp`).
  - Already isolated from build artifacts; we will gitignore it.
  - Does not mix with unrelated Node caches under `node_modules/`.
- **Override**: `--cache-dir <path>` flag, or `SCRAPER_CACHE_DIR` env var if set. Flag wins over env.
- **gitignore**: add `.cache/` (single directory entry — broad enough to also catch any future caches without needing more lines later).

### Cache layout

For each cached URL, write **two sibling files** in a flat directory keyed by SHA-256 of the canonical URL:

```
.cache/scraper/
  ab12cd34ef…/      ← shard by first 2 hex chars of the hash (e.g. `ab/12cd34…`)
    12cd34ef….body.html
    12cd34ef….meta.json
```

Use a 2-character shard prefix to avoid one giant directory of 1000+ files (filesystems handle it but `ls` becomes painful for the user).

The `meta.json` contains:

```json
{
  "url": "https://thelivingvalley.earthbornegames.com/docs/...",
  "status": 200,
  "contentType": "text/html; charset=utf-8",
  "fetchedAt": "2026-04-19T12:34:56.789Z",
  "bodyBytes": 84231
}
```

Why two files: keeps the body inspectable as plain HTML in any editor and avoids the cost/friction of base64-encoding it inside JSON.

Why hash the URL instead of mirroring the path: URL paths can contain characters that would need escaping (already true for query strings if any appear later), and the upstream site has multiple hostnames (`thelivingvalley.earthbornegames.com` and `thelivingvalley.earthbornerangers.com`, see `isLivingValleyHost` in `scrape-reference-sections.mjs:547`). Hashing the full URL makes collisions impossible without us thinking about escaping rules.

The hash is `sha256(url).slice(0, 32)` (16 bytes / 32 hex chars — plenty for collision avoidance at this scale, shorter filenames).

### Cache modes

A single `--cache-mode <mode>` flag (and equivalently per-mode shortcut flags) controls behavior:

| Mode      | Read from cache?           | Write to cache?       | On cache miss                    | Shortcut flag        |
| --------- | -------------------------- | --------------------- | -------------------------------- | -------------------- |
| `auto`    | Yes (default behavior)     | Yes                   | Fetch from network               | (default)            |
| `refresh` | No (ignore existing)       | Yes (overwrite)       | Fetch from network               | `--refresh`          |
| `offline` | Yes                        | No                    | **Error** and abort the script   | `--offline`          |
| `bypass`  | No                         | No                    | Fetch from network (no caching)  | `--no-cache`         |

The shortcut flags are sugar — internally they all set `cacheMode`. If a user passes both `--cache-mode` and a shortcut, the shortcut wins (it is more specific) and a warning is printed. If two shortcuts conflict, the script aborts with an error.

Additionally:

- `--clear-cache` — delete the cache directory before running the scraper (then proceed with whatever mode is active). Implemented as `rm -rf` of the cache dir; safe because the directory is dedicated to this purpose.
- `--cache-dir <path>` — override storage location (otherwise `.cache/scraper` under the repo root, or `SCRAPER_CACHE_DIR` env var).

### Logging

Per-request logging stays terse; the cache adds a one-character status prefix per fetch:

- `cache hit` → `[H]`
- `cache miss → fetched` → `[M]`
- `refresh → fetched` → `[R]`
- `offline miss → error` → `[X]`
- `bypass → fetched` → `[B]`

End-of-run summary line, printed once per script:

```
Cache: 137 hits, 3 misses, 0 errors  ·  cache dir: .cache/scraper
```

This makes it obvious at a glance that the second run hit the cache for everything.

### Concurrency safety

`scripts/scrape-reference-sections.mjs` runs 6 workers in parallel. Two workers may try to fetch the same URL only if a path is enqueued more than once — the existing `queued` Set already prevents that, so cache writes for the same key never race. Still, write atomically:

1. Write `…body.html.tmp` and `…meta.json.tmp`.
2. `rename()` both into place.

If the process is killed mid-write, the partial `.tmp` files are harmless leftovers and will be overwritten on the next attempt. The cache loader must skip any entry whose `meta.json` is missing or unparseable (treat as a miss).

### Where the cache plugs in

Both scripts already funnel network I/O through a single function. Replace the body of those functions with a call to a shared helper, leaving the existing retry/backoff behavior intact for the actual network path:

- `scripts/scrape-rules.mjs` → `fetchEntry` calls `cachedFetchText(url, { cache, retries: 3 })`, then passes the result to `extractContent`.
- `scripts/scrape-reference-sections.mjs` → `fetchPage` calls `cachedFetchText(url, { cache, retries: 3, timeoutMs: FETCH_TIMEOUT_MS, headers: { "user-agent": "..." } })`.

The cache module owns retry/backoff for network fetches so the two scripts stay aligned. Reuse what `scrape-reference-sections.mjs` already does (linear backoff `1000 * attempt` ms, 3 attempts) — that is also what `scrape-rules.mjs` does, so it is already consistent.

The 150 ms politeness sleep in `scrape-rules.mjs:399` should only apply when a request actually hit the network, not on cache hits. (Otherwise a fully-cached run still takes ~20 seconds for nothing.) The cache helper's return value should indicate whether the response came from the cache so the caller can skip the sleep.

## File-by-file implementation

### 1. New file: `scripts/lib/scraper-cache.mjs`

Create the directory `scripts/lib/` and add this module. Public API:

```js
// scripts/lib/scraper-cache.mjs
// No dependencies beyond Node built-ins.

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
export function createCache({ dir, mode }) { /* ... */ }

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
 *   retries?: number,         // default 3
 *   timeoutMs?: number,       // default 15000
 *   headers?: Record<string, string>,
 * }} options
 * @returns {Promise<{ body: string, fromCache: boolean, status: number }>}
 */
export async function cachedFetchText(url, options) { /* ... */ }

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
export function parseCacheArgs(argv = process.argv.slice(2)) { /* ... */ }
```

Implementation details:

- `read(url)`: hash the URL, build the path under `dir`, read meta + body. If meta is missing or JSON.parse fails, return `null` (treat as miss; do not crash). If body is missing while meta exists, also return `null` and log a warning.
- `write(url, body, meta)`: ensure shard directory exists with `mkdir({ recursive: true })`. Write `.body.html.tmp` and `.meta.json.tmp`, then `rename()` both into place. Wrap meta with the fields shown above.
- `clear()`: `rm -rf` the cache directory using `fs.rm(dir, { recursive: true, force: true })`. Then recreate it empty with `mkdir({ recursive: true })`.
- `stats()`: return the running counters; the caller is responsible for printing the summary.
- `cachedFetchText`:
  - Compute the cache key from the URL.
  - If mode allows reads (`auto` or `offline`), call `cache.read(url)`. On hit, increment `hits` and return `{ body, fromCache: true, status: meta.status }`.
  - If mode is `offline` and there is no hit, increment `errors` and throw a clear error: `"Cache miss for ${url} (offline mode)"`.
  - Otherwise perform the network fetch with retries and timeout (port the retry loop from `scrape-reference-sections.mjs:635-662`). On HTTP non-2xx, throw with the same `"HTTP ${status} for ${url}"` message the existing scripts use, so error reporting in the calling scripts does not change.
  - On success, if mode allows writes (`auto` or `refresh`), call `cache.write` and increment the appropriate counter (`misses` for auto, `refreshes` for refresh). For `bypass`, increment `bypasses` and skip the write.
- `parseCacheArgs`:
  - Recognize `--cache-mode <mode>`, `--refresh`, `--offline`, `--no-cache`, `--clear-cache`, `--cache-dir <path>`.
  - `--cache-mode` accepts only `auto | refresh | offline | bypass` — error otherwise.
  - Conflicting shortcut flags (e.g. both `--refresh` and `--offline`) → exit with a clear error.
  - Default cache dir: respect `SCRAPER_CACHE_DIR` env var, otherwise `path.join(repoRoot, ".cache", "scraper")` where `repoRoot` is computed as `path.join(dirname(fileURLToPath(import.meta.url)), "..", "..")` (this file lives at `scripts/lib/`).
  - `--cache-dir` overrides both env and default.

### 2. Modify `scripts/scrape-rules.mjs`

- Add imports at the top:
  ```js
  import {
    cachedFetchText,
    createCache,
    parseCacheArgs,
  } from "./lib/scraper-cache.mjs";
  ```
- Inside `main()`, before the loop:
  ```js
  const cacheArgs = parseCacheArgs();
  const cache = createCache({ dir: cacheArgs.dir, mode: cacheArgs.mode });
  if (cacheArgs.clear) {
    await cache.clear();
    console.log(`Cleared cache at ${cache.dir}`);
  }
  console.log(`Cache mode: ${cache.mode}  ·  dir: ${cache.dir}\n`);
  ```
- Refactor `fetchEntry(letter, slug)` to call `cachedFetchText(url, { cache, retries: 3 })` instead of doing its own `fetch` + retry loop. The new body is roughly:
  ```js
  async function fetchEntry(letter, slug) {
    const url = `${BASE}/${letter}/${slug}`;
    try {
      const { body, fromCache } = await cachedFetchText(url, { cache, retries: 3 });
      const entry = extractContent(body, letter, slug);
      return entry ? { ...entry, fromCache } : null;
    } catch (err) {
      console.warn(`  Error for ${url}: ${err.message}`);
      return null;
    }
  }
  ```
- Update the per-slug `process.stdout.write` line to print the cache status prefix (`[H]`, `[M]`, etc.). The simplest way: have the function return `{ ...entry, fromCache }` and let the caller print the prefix based on `cache.mode` + `fromCache`. Or expose a `lastFetchSource` from the cache. Pick whichever is cleaner — both are fine, but be consistent across both scripts.
- Skip the 150 ms politeness sleep when `fromCache === true`. (Sleep only on network fetches.)
- After the loop, print `cache.stats()` summary in the format shown earlier.

### 3. Modify `scripts/scrape-reference-sections.mjs`

- Same imports as above (path is `./lib/scraper-cache.mjs`).
- Set up cache in `main()` before iterating `SECTIONS`, same way as in scrape-rules.
- `fetchPage(path, retries = 3)` becomes a thin wrapper around `cachedFetchText`. The retry/timeout/user-agent logic moves into the cache module — pass `timeoutMs: FETCH_TIMEOUT_MS` and the existing `user-agent` header through options. Preserve the "throw on non-2xx" contract because the calling worker relies on errors propagating.
- The per-page log line (`scrape-reference-sections.mjs:87`) should include the cache prefix. Easiest: change `fetchPage` to return `{ html, fromCache }` and update the caller in `crawlSection` to render the prefix.
- After all sections are processed, print the cache stats summary once.

### 4. `.gitignore`

Add a single entry. Insert under the existing build/cache section near `dist`:

```
.cache/
```

Place it logically near `dist` and `coverage` — this is a build/artifact entry, not an env or test entry.

### 5. `frontend/README.md`

Find any section that documents how to refresh the embedded reference docs (look for the `node scripts/scrape-*.mjs` invocations referenced in `docs/rules-reference-retrospective.md`). Add a short subsection that documents the new flags. Suggested wording:

> The scrapers cache raw upstream responses under `.cache/scraper/` so that re-running them after tweaking transformation logic does not re-hit the network. Useful flags:
>
> - `--refresh` — ignore existing cache, re-fetch everything, and overwrite.
> - `--offline` — fail if anything would require a network request (handy on a plane or for CI).
> - `--no-cache` — bypass the cache for one run (do not read from it, do not write to it).
> - `--clear-cache` — delete the cache directory before running.
> - `--cache-dir <path>` — store the cache somewhere other than `.cache/scraper`.

If `frontend/README.md` does not currently mention the scrapers, do not invent a new section — add the same blurb to `docs/rules-reference-retrospective.md` under a new `## Cache` heading instead. Pick exactly one location, not both.

## CLI behavior — examples to verify against

```sh
# First run: populates cache
node scripts/scrape-rules.mjs
# → all entries logged with [M], summary "0 hits, ~140 misses".

# Second run: hits cache for everything
node scripts/scrape-rules.mjs
# → all entries logged with [H], summary "~140 hits, 0 misses".
# → wall-clock time dominated by HTML parsing, not network. Should be < 5 s.

# Force re-fetch (e.g. upstream content changed)
node scripts/scrape-rules.mjs --refresh
# → all entries logged with [R], cache files updated in place.

# CI / no network
node scripts/scrape-rules.mjs --offline
# → succeeds if the cache is fully populated, errors otherwise.

# Disable cache for a one-off
node scripts/scrape-rules.mjs --no-cache
# → all entries logged with [B], cache directory unchanged.

# Wipe and rebuild
node scripts/scrape-rules.mjs --clear-cache
# → cache cleared, then a normal `auto` run repopulates it.

# Same flags for the other scraper
node scripts/scrape-reference-sections.mjs --offline
```

## Verification steps (run these after implementation)

1. **Lint**:
   ```sh
   npx biome check scripts/scrape-rules.mjs scripts/scrape-reference-sections.mjs scripts/lib/scraper-cache.mjs
   ```
   Fix any issues. The existing `biome-ignore-all` comment at the top of each scraper covers `noConsole`; the new module probably needs the same comment if it logs.

2. **First-run population**:
   ```sh
   rm -rf .cache/scraper
   node scripts/scrape-rules.mjs
   ```
   Confirm:
   - The cache directory is created and contains shard subdirectories with `.body.html` + `.meta.json` pairs.
   - The summary shows ~140 misses and 0 hits.
   - `frontend/src/assets/rules.html` is regenerated.

3. **Cache-hit run**:
   ```sh
   node scripts/scrape-rules.mjs
   ```
   Confirm:
   - Summary shows ~140 hits and 0 misses.
   - Wall-clock time is dramatically lower (a few seconds, not minutes).
   - `frontend/src/assets/rules.html` is byte-identical to the first run (`git diff --stat frontend/src/assets/rules.html` shows no change).

4. **Offline mode**:
   ```sh
   node scripts/scrape-rules.mjs --offline
   ```
   Should succeed identically. Then:
   ```sh
   rm -rf .cache/scraper
   node scripts/scrape-rules.mjs --offline
   ```
   Should fail on the very first request with a clear "Cache miss … (offline mode)" error.

5. **Refresh mode**:
   ```sh
   node scripts/scrape-rules.mjs --refresh
   ```
   Should re-fetch everything. Confirm `mtime` on cache files updates.

6. **Repeat 2–5 for the other scraper**:
   ```sh
   node scripts/scrape-reference-sections.mjs
   ```
   This one is much larger (~983 pages for Campaign Guides alone). The cached run should complete in seconds. Verify all four output files are byte-identical to a fresh-fetch run.

7. **Frontend build still passes**:
   ```sh
   npm run check -w frontend
   npm run build -w frontend
   ```

8. **`.gitignore`**:
   ```sh
   git check-ignore -v .cache/scraper/foo
   ```
   Should report that `.gitignore` matches.

## Edge cases & what to watch for

- **Concurrent writes for distinct keys** are fine. Concurrent writes for the *same* key cannot happen because the queue dedupes via `queued` Set — but if that ever changes, the atomic `rename()` strategy still keeps the cache in a consistent state (last writer wins; no torn files).
- **HTTP errors**: do not cache non-2xx responses. The `cachedFetchText` retry loop should throw exactly as the existing code does, so the calling worker sees the same error type.
- **Redirects**: `fetch()` follows redirects by default. Cache the URL the caller asked for (the input URL), not the final URL — that keeps the key stable across redirect target changes. The body we cache is the post-redirect body.
- **`scrape-rules.mjs` returns `null` on transformation failure**, which is different from a fetch failure. Caching is independent: a successful fetch with a body that yields `null` from `extractContent` is still a valid cache write. Future runs of an updated `extractContent` may succeed against the same cached HTML.
- **Cache invalidation when upstream changes**: this is manual. The user knows when the upstream docs have been updated and runs `--refresh` to re-pull. We do not want to add HEAD-request validation or ETag handling — that would partially defeat the "be nice to their server" goal and adds complexity for little gain at this scale.
- **Argv pollution**: neither script currently parses argv. After this change, `parseCacheArgs` will own argv parsing for cache flags. If a future change adds non-cache flags, they need to coordinate (the function should error on unknown flags only after consuming the cache flags).

## Out of scope (do not do)

- Do not move the scrapers into a workspace package; they are fine as one-off scripts.
- Do not introduce TypeScript for the cache module; the surrounding scripts are `.mjs` for a reason and we want to keep this dependency-free.
- Do not add a `package.json` script alias (e.g. `npm run scrape:rules`). The existing invocations in `docs/rules-reference-retrospective.md` use raw `node scripts/...` calls; preserve that pattern.
- Do not refactor the scrapers' transformation logic, sanitizers, or icon mappings. The caching change should be purely additive at the network layer.

## Definition of done

- New file `scripts/lib/scraper-cache.mjs` exists and exports the API above.
- Both scrapers route their HTTP calls through `cachedFetchText`.
- All five CLI flags work as documented (`--refresh`, `--offline`, `--no-cache`, `--clear-cache`, `--cache-dir`, plus `--cache-mode`).
- `.gitignore` excludes `.cache/`.
- Cached re-runs produce byte-identical output to fresh runs.
- A cached re-run of `scripts/scrape-reference-sections.mjs` completes without making any network requests (verify with `--offline` if unsure).
- `npx biome check` is clean for the touched files.
- `npm run build -w frontend` still succeeds.
- The retrospective or README is updated with the new flags.
