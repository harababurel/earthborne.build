# Code audit findings — July 2026

Full-project audit performed 2026-07-08 at commit `1fba8916`. This document is a
remediation plan: every finding includes the affected code, a failure scenario,
a detailed proposed fix, caveats, verification steps, and new test cases. It is
written so that fixes can be implemented autonomously, finding by finding.

**Line numbers reference commit `1fba8916` and will drift.** Always locate code
by file path + function/symbol name; line numbers are hints only.

## Audit scope

- **Read in full:** `backend/src/**` (routes, db queries, auth libs, app setup),
  `shared/src/**` (schemas, DTOs, libs), and the frontend core:
  `frontend/src/store/{slices,lib,persist,services}` (sync engine, sharing,
  backup, deck validation), plus security-relevant rendering paths
  (`dangerouslySetInnerHTML` call sites).
- **Pattern-scanned only:** the remaining ~500 frontend component/page files.
- Baseline health: `npm run test -w backend` (49 tests) passes,
  `npm run check -w backend` and `npm run check -w frontend` are clean.

## Rules for the implementing agent

1. Fix findings in separate commits (one finding per commit, or explicitly
   grouped, e.g. F6+F7). Never use `git add -A`; stage specific files.
2. **No AI attribution in commits.** No `Co-Authored-By`, no `Generated-By`.
3. After each fix, run the scoped checks listed under that finding's
   *Verification* section. At minimum: `npx biome check <changed files>`, the
   relevant workspace typecheck (`npm run check -w backend` / `-w frontend`),
   and the relevant test suite (`npm run test -w backend` / `-w frontend` /
   `-w shared`).
4. **Never start a dev server** (`npm run dev`, vite, backend server). The user
   runs their own instance at `dev.harababurel.com`.
5. Frontend UI text must go through i18n (`frontend/src/locales/en.json` +
   `useTranslation`). No hardcoded strings in JSX. No inline styles. No `any`.
6. Backend schema changes go through dbmate migrations in
   `backend/src/db/migrations/` (format: `YYYYMMDDHHMMSS_name.sql` with
   `-- migrate:up` / `-- migrate:down` sections). After adding a migration,
   also update the handwritten Kysely types in
   `backend/src/db/schema.types.ts`, and update `backend/src/db/schema.sql`
   (dbmate regenerates it when running `npm run db:migrate -w backend`; if you
   cannot run dbmate, edit `schema.sql` manually to match and note it in the
   commit message).
7. Backend integration tests do **not** mock the database — they use in-memory
   SQLite. See `backend/src/tests/sharing.spec.ts` for the setup pattern
   (`getDatabase(":memory:")` + `applySqlFiles(db, "../db/migrations")` +
   `appFactory(config, db, mailer)` and calling `ctx.app.request(...)`).
8. Frontend store tests use `getMockStore` from `@/test/get-mock-store` and
   factories from `@/test/factories`, with `fetch` mocked via a route table —
   see `frontend/src/store/slices/sync.spec.ts` for the exact pattern.

## Status tracker

All findings were fixed on 2026-07-09. See the remediation record below the
table for review notes.

| ID  | Severity | Title | Status |
|-----|----------|-------|--------|
| F1  | High | Shares are silently listed in the public deck directory | fixed — `0e680732` + follow-up `9e55af46` |
| F2  | High | Public decklist search 500s on malformed `required`/`excluded` | fixed — `0d2a2ca3` |
| F3  | High | `deleteAllDecks` discards its `deckEdits`/`undoHistory` cleanup | fixed — `5c5d16ef` |
| F4  | High | Remote-deletion push 404 creates a permanent sync-error loop | fixed — `5c5d16ef` |
| F5  | High | No rate limiting on `/login` and other auth endpoints | fixed — `29db4b99` |
| F6  | Medium | Share PUT/DELETE report success when no row was affected; duplicate POST 500s | fixed — `3a97fed1` |
| F7  | Medium | Local deck save is blocked when the share API is unreachable | fixed — `3a97fed1` + `da2953a4` |
| F8  | Medium | Deck validation accepts expert/role cards as outside interest | fixed — `dfd18568` |
| F9  | Medium | Email-existence oracles in resend-verification / forgot-password / login | fixed — `29db4b99` |
| F10 | Medium | `complete-profile` can exceed SQLite's bound-variable limit | fixed — `510c2b2e` |
| F11 | Low | Concurrent signup race returns 500 instead of 400 | fixed — `29db4b99` |
| F12 | Low | Admin API key: non-constant-time compare, no minimum length | fixed — `29db4b99` |
| F13 | Low | `GET /cards/:code` turns every error into a 404 | fixed — `510c2b2e` |
| F14 | Low | CORS wildcard origins match any scheme | fixed — `510c2b2e` |
| F15 | Low | LIKE search does not escape `%` and `_` | fixed — `510c2b2e` |
| F16 | Low | `decodeSearch` misreads plain-string values | fixed — `0d2a2ca3` |
| F17 | Low | `deleteDeck` crashes on a missing deck id | fixed — `5c5d16ef` |
| F18 | Low | `deck_limit: 0` is treated as limit 2 in validation | fixed — `dfd18568` |
| F19 | Low | `shared` workspace test script runs zero tests | fixed — `0d2a2ca3` + `510c2b2e` |

## Remediation record (2026-07-09)

The fixes landed as eight commits (`5c5d16ef`, `0d2a2ca3`, `3a97fed1`,
`0e680732`, `29db4b99`, `dfd18568`, `da2953a4`, `510c2b2e`) plus one follow-up
(`9e55af46`). Every commit was reviewed against this document; all scoped
checks pass (biome, both typechecks, backend 65 tests, shared 10 tests,
frontend 282 tests, frontend production build).

Review outcomes worth recording:

- **F1 follow-up (`9e55af46`):** the original implementation backfilled
  existing `shared_deck` rows to `listed = 1` server-side (per this
  document's default), but the frontend persist migration initialized
  `sharing.listed` to an empty map — legacy shares displayed as unlisted and
  the next share update would have PUT `listed: false`, silently unlisting
  them. The follow-up makes migration `0016-add-share-listed` mark every
  pre-existing share as listed, matching the server backfill. Caveat: clients
  that already ran the unfixed migration (persist version 17) won't rerun it;
  affected decks need their "List in Deck Guides" toggle flipped once.
- **F12 deployment caveat (resolved):** `ADMIN_API_KEY: z.string().min(16)`
  rejects short keys at boot. The local dev `.env` key was rotated to a
  longer secret; production keys must also be ≥16 chars before deploying.
- **F7 ordering:** satisfied by folding the local-save reorder into the F6
  commit (`3a97fed1`); the user-visible failure toast followed in `da2953a4`.
- **F18 data check:** the card database contains no `deck_limit = 0` rows, so
  the semantic change is safe against current data.
- Deliberate implementation deviations from this document, all reviewed as
  fine: the F4 fix clears sync items via `replaceDeckSyncItems`/
  `replaceCampaignSyncItems` instead of `setDeckSyncItem(id, null)`
  (equivalent, also recomputes aggregate status); the F7 toast is driven by a
  `ui.shareUpdateFailure` store field surfaced in `app.tsx` rather than a
  slice-level toast dependency; F1's `GET /share/history/:id` now returns a
  `listed` field that the share modal state does not yet consume (local state
  is the source of truth).
- Cosmetic: `backend/src/db/schema.sql` was reordered by a dbmate
  regeneration in `0e680732` (content-equivalent). Two share affordances now
  exist (the legacy toggle in `deck-display/hooks.ts` creates unlisted
  shares; the share modal adds listing controls) — flagged for a future UX
  pass, not a defect.

---

## F1 — Shares are silently listed in the public deck directory

**Severity:** High (privacy).
**Files:**
- `backend/src/db/queries/decklists.ts` — `searchSharedDecks` (whole function)
- `backend/src/routes/sharing.ts` — POST `/` and PUT `/:id`
- `backend/src/db/queries/sharing.ts` — `createSharedDeck`, `updateSharedDeck`
- `backend/src/db/schema.types.ts` — `SharedDeck` type
- `backend/src/db/migrations/` — new migration
- `frontend/src/store/slices/sharing.ts` — `createShare`
- `frontend/src/store/services/queries.ts` — `createShare`, `updateShare`
- `frontend/src/locales/en.json` — `deck_view.sharing.*` (~line 1124)

### Problem

The share dialog promises link-only visibility:

> `deck_view.sharing.create_tooltip`: "Sharing creates a publicly accessible,
> read-only link to the deck. Anyone with the link can view the deck …"

But `searchSharedDecks` queries the **entire** `shared_deck` table with no
visibility filter, and that query backs the public, unauthenticated
`GET /v2/public/decklists` endpoint, which feeds the public `/decklists`
("Deck Guides") browse page. Consequence: creating any share publishes the
deck — name, author name (if profile complete), full description — to a
browsable public directory. Users were told link-only; they got listed.

### Decision required (with default)

- **Option A (recommended, implement this unless told otherwise):** add a
  `listed` flag to `shared_deck`. Shares default to unlisted; the directory
  only shows listed shares; the share dialog gains a "List in Deck Guides"
  toggle.
- **Option B (copy-only):** keep behavior, rewrite the tooltip to say shares
  are publicly listed. Cheaper but makes the privacy regression permanent.

For existing rows the migration must pick a default. **Default existing rows
to `listed = 1`** (they are already public and discoverable today, so this
preserves the live directory and does not destroy data), and note in the
commit message that the site owner may want to notify users / offer a bulk
unlist. If the owner prefers privacy-first, flip the backfill to `0` — the
migration below marks the line to change.

### Fix (Option A)

1. **Migration** — `backend/src/db/migrations/20260708000000_add_shared_deck_listed.sql`:

```sql
-- migrate:up

ALTER TABLE shared_deck ADD COLUMN listed INTEGER NOT NULL DEFAULT 0;
-- Backfill: existing shares are already publicly listed today, keep them
-- listed to avoid silently emptying the Deck Guides directory.
-- (Change to `SET listed = 0` for a privacy-first backfill.)
UPDATE shared_deck SET listed = 1;
CREATE INDEX idx_shared_deck_listed ON shared_deck (listed);

-- migrate:down

DROP INDEX idx_shared_deck_listed;
ALTER TABLE shared_deck DROP COLUMN listed;
```

2. **Types** — in `backend/src/db/schema.types.ts`, add `listed: number;` to
   the `shared_deck` table interface (SQLite has no boolean; use `0 | 1`
   semantics, type as `number`).

3. **Queries** — `backend/src/db/queries/sharing.ts`:
   - `createSharedDeck`: accept and insert `listed` (the `Omit<...>` param type
     already picks it up once the schema type has it; pass it through).
   - `updateSharedDeck`: add a `listed: number` parameter and include it in
     `.set({...})`.
   - `searchSharedDecks` in `backend/src/db/queries/decklists.ts`: add
     `.where("shared_deck.listed", "=", 1)` to the base query builder `q`
     right after the `leftJoin`.

4. **Routes** — `backend/src/routes/sharing.ts` (POST and PUT):
   the request body is `{...deck, history}` and `DeckSchema.safeParse` strips
   unknown keys, so add a sibling field:

```ts
const body = await c.req.json();
const { history, listed, ...deckData } = body;
// ...
await createSharedDeck(c.get("db"), {
  // ...existing fields...
  listed: listed === true ? 1 : 0,
});
```

   Same for PUT → `updateSharedDeck(..., listed === true ? 1 : 0)`.
   Note: PUT overwrites `listed` on every update, so the frontend must always
   send the current value (see step 5). `GET /history/:id` needs no change
   (link-access is unaffected), but include `listed: !!sharedDeck.listed` in
   its JSON response so the frontend can display the toggle state.

5. **Frontend:**
   - `frontend/src/store/services/queries.ts`: extend `createShare` /
     `updateShare` signatures with `listed: boolean` and include it in the
     JSON body. Extend the `ShareRead` type with `listed?: boolean`.
   - `frontend/src/store/slices/sharing.ts` + `sharing.types.ts`: the slice
     currently stores `sharing.decks[id] = deck.date_update` (a string). Store
     the listed flag alongside — either widen the map value to
     `{ dateUpdate: string; listed: boolean }` (requires a persist migration in
     `frontend/src/store/persist/migrate.ts`, bump `VERSION` in
     `frontend/src/store/persist/storage.ts`), or keep a parallel
     `sharing.listed: Record<string, boolean>` map (no migration needed for
     additive state; prefer this simpler route).
   - `updateShare` in the slice must pass the stored listed flag so PUTs don't
     silently unlist.
   - Share UI: the share section is driven by `frontend/src/components/deck-display/hooks.ts`
     (`createShare`/`deleteShare` usage) — add a checkbox ("List in public Deck
     Guides") to the share popover component that renders
     `deck_view.sharing.*` strings. New i18n keys under `deck_view.sharing`:
     `"listed_label": "List in public Deck Guides"`,
     `"listed_help": "When enabled, this share appears in the public Deck Guides directory. When disabled, only people with the link can view it."`.
   - Update `create_tooltip` copy to mention the toggle.

### Caveats

- `shared/src/dtos/decklist-search-response.schema.ts` and the frontend
  decklists page do not need changes (unlisted decks simply stop appearing).
- Do not filter `getSharedDeck` (`/history/:id`) by `listed` — link access must
  keep working for unlisted shares.
- The backend `sharing.spec.ts` tests POST shares and then queries
  `/v2/public/decklists`; those tests must now POST with `listed: true` (or be
  split to assert both behaviors).

### Verification

- `npm run db:migrate -w backend` applies cleanly (needs `DATABASE_URL`; in
  tests, `applySqlFiles` picks the migration up automatically).
- `npm run test -w backend`, `npm run check -w backend`,
  `npm run check -w frontend`, `npx biome check` on changed files.

### New tests (`backend/src/tests/sharing.spec.ts`)

1. POST a share **without** `listed` → `GET /v2/public/decklists` does not
   contain it; `GET /v2/public/share/history/:id` still returns 200.
2. POST with `listed: true` → appears in `/v2/public/decklists`.
3. PUT with `listed: false` on a listed share → disappears from the directory.

---

## F2 — Public decklist search 500s on malformed `required`/`excluded`

**Severity:** High (public unauthenticated 500; trivially scriptable).
**Files:**
- `shared/src/dtos/decklist-search-request.schema.ts` — `DecklistSearchRequestSchema`
- `backend/src/db/queries/decklists.ts` — `searchSharedDecks` (~lines 28–41)

### Problem

`searchSharedDecks` builds a JSON path by SQL string concatenation:

```ts
q = q.where(sql`json_extract(data, '$.slots.' || ${req})`, "is not", null);
```

The value is parameterized (no SQL injection), but the concatenated string is
evaluated by SQLite as a **JSON path**. Any `required`/`excluded` element that
is not a bare identifier — a space, quote, `[`, `$`, leading digit-with-dot,
etc. — makes `json_extract` raise a runtime "JSON path error", which becomes an
unhandled exception → HTTP 500. Example:
`GET /v2/public/decklists?required=a%20b` → 500.

Card codes in this project are alphanumeric (e.g. `01100`), so a strict
character allowlist loses nothing.

### Fix

1. **Primary (validation):** in `DecklistSearchRequestSchema`, constrain the
   array elements:

```ts
const cardCodeSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
// ...
required: z.preprocess(coerceStringArray, z.array(cardCodeSchema).max(20)).optional(),
excluded: z.preprocess(coerceStringArray, z.array(cardCodeSchema).max(20)).optional(),
```

   The route already runs `zodValidator("query", ...)` which converts parse
   failures into HTTP 400 (`backend/src/lib/validation.ts`).

2. **Defense in depth (optional but cheap):** in `searchSharedDecks`, build the
   full path in JS and pass it as one parameter, so the path is at least never
   assembled inside SQL:

```ts
q = q.where(sql`json_extract(data, ${"$.slots." + req})`, "is not", null);
```

   (Note this alone does NOT fix the 500 — an invalid path string still throws
   in SQLite — the schema regex is the actual fix.)

Also apply the same `.max(...)` bound thinking to `name`/`tags` (already
max-255 / plain strings; fine).

### Caveats

- The frontend filter UI (`frontend/src/pages/browse-decklists/decklists-filters/`)
  only ever submits real card codes, so tightening the schema breaks no
  legitimate client. Check `deckSearchQuery` round-trips still parse
  (`parseDeckSearchQuery` uses the same schema — an old bookmarked URL with a
  now-invalid param will make `decodeSearch`'s `schema.parse` throw; see F16
  for making that non-fatal).

### Verification

- `npm run test -w backend && npm run check -w backend`.
- Manual: `app.request("/v2/public/decklists?required=a b")` in a test returns
  400, not 500.

### New tests (`backend/src/tests/sharing.spec.ts` or a new `decklists.spec.ts`)

1. `GET /v2/public/decklists?required=a%20b` → 400.
2. `GET /v2/public/decklists?required='%3B--` → 400.
3. `GET /v2/public/decklists?required=01100` with a share containing slot
   `01100` → 200 and the deck is returned (regression guard).

---

## F3 — `deleteAllDecks` discards its `deckEdits`/`undoHistory` cleanup

**Severity:** High (state corruption / ghost data).
**File:** `frontend/src/store/slices/app.ts` — `deleteAllDecks` (~lines 311–346).

### Problem

The `set()` callback builds pruned copies of all four maps but only returns
two of them:

```ts
const edits = { ...state.deckEdits };          // pruned in the loop…
const undoHistory = { ...state.data.undoHistory }; // pruned in the loop…
// ...
return {
  data: {
    ...state.data,   // ← old undoHistory retained via spread
    decks,
    history,
    campaigns,
  },
  // ← `deckEdits: edits` is missing entirely
};
```

So after "delete all decks", every deleted deck's pending edits and undo
history remain in the store and are persisted to IndexedDB. If a deck with the
same id reappears (backup restore, account sync download, share import), it
silently inherits the stale edits/undo entries.

### Fix

In the returned object of the `set()` callback:

```ts
return {
  deckEdits: edits,
  data: {
    ...state.data,
    decks,
    history,
    undoHistory,
    campaigns,
  },
};
```

No other changes; the pruning loop above is already correct.

### Caveats

- The subsequent `dehydrate(get(), "app", "edits")` call already persists both
  storage buckets, so no persistence change is needed.
- Do not "simplify" the loop into fresh `{}` objects: `deleteAllDecks` must
  only remove deck-keyed entries, and today decks are the only keys in those
  maps — but keep the surgical deletes to stay robust.

### Verification

- `npm run test -w frontend`, `npm run check -w frontend`.

### New test (`frontend/src/store/slices/app.spec.ts`)

Using `getMockStore`: seed a deck, add a `deckEdits[id]` entry and an
`undoHistory[id]` entry (via existing factories/actions), call
`deleteAllDecks()`, then assert:

```ts
expect(store.getState().deckEdits).toEqual({});
expect(store.getState().data.undoHistory).toEqual({});
```

(Adapt to the factory API in `@/test/factories`; `makeData` accepts decks.)

---

## F4 — Remote-deletion push 404 creates a permanent sync-error loop

**Severity:** High (sync engine wedges; visible persistent error badge).
**Files:** `frontend/src/store/slices/sync.ts` —
`pushDeckDeletion` (~lines 933–967) and `pushCampaignDeletion` (~lines 1133+).

### Problem

Backend `DELETE /v2/account/decks/:id` returns **404** when the row does not
exist (`backend/src/routes/account-decks.ts`). The frontend's
`pushDeckDeletion` treats every failure as an error:

```ts
} catch (error) {
  ...
  set((prev) => ({ sync: updateDeckSyncError(prev.sync, id, error, "delete") }));
  ...
  throw error;
}
```

Sequence that wedges: device B deletes deck remotely → device A (which still
has a sync item for it) deletes the deck locally → `pushDeckDeletion` → 404 →
sync item marked `status: "error"` for a deck that no longer exists locally →
next reconciliation (`reconcileItems` in `store/lib/sync-reconciliation.ts`)
sees "local missing + syncItem exists" → classifies it as `remoteDeletions` →
pushes deletion again → 404 again → error again. `"error"` is not in
`SKIPPED_ITEM_STATUSES`, so this repeats on every sync, forever, and the
global sync status stays `error`.

### Fix

A 404 on delete means "already gone" — that is success for an idempotent
delete. In **both** `pushDeckDeletion` and `pushCampaignDeletion`, handle it
before the generic error path:

```ts
} catch (error) {
  if (!isCurrentAccount(get(), accountId)) return;

  if (error instanceof ApiError && error.status === 404) {
    get().setDeckSyncItem(id, null);        // setCampaignSyncItem in the twin
    await dehydrate(get(), "app", "edits");
    return;
  }

  set((prev) => ({ sync: updateDeckSyncError(prev.sync, id, error, "delete") }));
  await dehydrate(get(), "app", "edits");
  throw error;
}
```

`ApiError` is already imported in `sync.ts` (used for the 409 rekey path in
`pushDeck`). Clearing the sync item (`setDeckSyncItem(id, null)`) matches the
success path.

### Caveats

- Do **not** treat 404 as success in `pushDeck` (PUT) — there a 404 means the
  deck vanished remotely while we hold local changes; the existing conflict
  machinery should handle that (out of scope here).
- A 409 delete conflict is already routed into `conflict` status by
  `updateDeckSyncError` + `isDeckConflictError`; do not change that.

### Verification

- `npm run test -w frontend` (the sync suite is extensive; all must pass),
  `npm run check -w frontend`.

### New tests (`frontend/src/store/slices/sync.spec.ts`)

Follow the existing route-table fetch-mock pattern:

1. `pushDeckDeletion` with a mocked
   `DELETE /v2/account/decks/<id>` → `json({message:"Deck not found"}, 404)`:
   expect it to **resolve** (not throw), and
   `store.getState().sync.decks.items[<id>]` to be `undefined`, and overall
   `sync.decks.status` not `"error"`.
2. Same for `pushCampaignDeletion` with campaigns.
3. Regression: a 500 response still throws and marks the item `"error"`.

---

## F5 — No rate limiting on `/login` and other auth endpoints

**Severity:** High (credential stuffing; scrypt CPU-DoS).
**Files:**
- new: `backend/src/lib/auth/rate-limit.ts`
- `backend/src/routes/auth.ts` — `/login`, `/signup`, `/forgot-password`,
  `/resend-verification`, `/reset-password`
- `backend/src/lib/hono-env.ts` (only if you attach anything to context; not
  required by the design below)

### Problem

`/signup` is protected by Turnstile (when `TURNSTILE_SECRET_KEY` is set), but
`/login` has **no** captcha and **no** throttling. An attacker gets unlimited
password guesses against known emails. Each guess also costs the server one
scrypt derivation (~64 MB / N=16384 by Node defaults), so the endpoint doubles
as a cheap CPU-exhaustion vector. `/reset-password` and `/verify-email` accept
unlimited token guesses too (tokens are 256-bit so brute force is unrealistic,
but throttling is still standard hygiene).

### Fix

The deployment is a single Node process with SQLite, so an in-memory limiter
is appropriate (no new dependencies, no schema change). Create
`backend/src/lib/auth/rate-limit.ts`:

```ts
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HonoEnv } from "../hono-env.ts";

type Bucket = { count: number; resetAt: number };

type RateLimitOptions = {
  /** Unique name so different endpoints don't share buckets. */
  scope: string;
  /** Max attempts per window per key. */
  limit: number;
  windowMs: number;
  /** Extracts an additional key from the request body (e.g. the email). */
  bodyKey?: (body: Record<string, unknown>) => string | undefined;
};

const buckets = new Map<string, Bucket>();

// Periodic sweep so the map cannot grow unboundedly.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref();

export function rateLimit(options: RateLimitOptions): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    const keys = [`${options.scope}:ip:${getClientIp(c) ?? "unknown"}`];

    if (options.bodyKey) {
      // Body can only be read once per request unless cloned.
      const body = await c.req.raw.clone().json().catch(() => undefined);
      const extra = body && options.bodyKey(body as Record<string, unknown>);
      if (typeof extra === "string" && extra) {
        keys.push(`${options.scope}:key:${extra.toLowerCase()}`);
      }
    }

    const now = Date.now();
    for (const key of keys) {
      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + options.windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      if (bucket.count > options.limit) {
        c.header("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
        throw new HTTPException(429, {
          message: "Too many attempts. Please try again later.",
        });
      }
    }

    await next();
  };
}

// TESTING use only.
export function resetRateLimits() {
  buckets.clear();
}

function getClientIp(c: Parameters<MiddlewareHandler<HonoEnv>>[0]) {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
  );
}
```

Wire it up in `backend/src/routes/auth.ts` (middleware goes **before** the
`zodValidator`):

```ts
router.post(
  "/login",
  rateLimit({ scope: "login", limit: 10, windowMs: 15 * 60 * 1000,
              bodyKey: (b) => typeof b.email === "string" ? b.email : undefined }),
  zodValidator("json", LoginRequestSchema),
  async (c) => { /* unchanged */ },
);
```

Suggested budgets (per 15-minute window): `/login` 10, `/signup` 5,
`/forgot-password` 5, `/resend-verification` 5, `/reset-password` 10.

### Caveats

- **Proxy trust:** `x-forwarded-for` is attacker-settable if the app is ever
  exposed without a trusted reverse proxy. The per-email key limits the damage
  (spoofed IPs still share the email bucket). Document this in a comment.
- The limiter counts attempts, not failures. 10 logins / 15 min / IP is far
  above legitimate use; do not try to count only failures (it complicates the
  middleware for negligible benefit).
- **Tests:** the module-level `buckets` map is shared across tests in one
  process. Export `resetRateLimits()` and call it in `beforeEach` of
  `auth.spec.ts`, otherwise existing auth tests will start flaking at the
  limit. Check whether existing suites hit an endpoint >limit times; if so,
  raise the limit via the options or reset between tests.
- NAT'd households sharing an IP may hit the IP bucket; 429 with `Retry-After`
  is an acceptable UX. The frontend already surfaces API error messages.

### Verification

- `npm run test -w backend`, `npm run check -w backend`.

### New tests (`backend/src/tests/auth.spec.ts`)

1. 11 consecutive `POST /v2/account/auth/login` with a wrong password → the
   11th returns 429 with a `Retry-After` header.
2. `resetRateLimits()` + 10 attempts → still 401 (not 429) on the 10th.
3. Different emails from the same IP share the IP bucket (11th request 429
   even with unique emails).

---

## F6 — Share PUT/DELETE report success when no row was affected; duplicate POST 500s

**Severity:** Medium (client state drift; raw 500).
**Files:**
- `backend/src/db/queries/sharing.ts` — `createSharedDeck`, `updateSharedDeck`,
  `deleteSharedDeck`
- `backend/src/routes/sharing.ts` — POST `/`, PUT `/:id`, DELETE `/:id`
- `backend/src/db/queries/account-decks.ts` — `isUniqueConstraintError`
  (reuse; already exported)

### Problem

1. `updateSharedDeck` / `deleteSharedDeck` call `.execute()` and ignore the
   affected-row count. The routes then return `{status:"ok"}` unconditionally.
   If the id does not exist, or exists but belongs to a different
   client/account, the caller is told the update/delete succeeded. The
   frontend then updates `sharing.decks[id]` (see
   `frontend/src/store/slices/sharing.ts`), so its local "is shared / share is
   current" bookkeeping drifts from reality.
2. `createSharedDeck` does a bare insert into a table whose `id` is the
   primary key. POSTing a share for an id that is already shared (double
   click, two devices, or an id squatted by someone else) raises
   `SQLITE_CONSTRAINT_PRIMARYKEY` → unhandled → HTTP 500.

### Fix

**Queries** (`backend/src/db/queries/sharing.ts`):

```ts
export async function updateSharedDeck(/* unchanged args */) {
  // ...build query exactly as today...
  const result = await query.executeTakeFirst();
  return result.numUpdatedRows > 0n;
}

export async function deleteSharedDeck(/* unchanged args */) {
  // ...build query exactly as today...
  const result = await query.executeTakeFirst();
  return result.numDeletedRows > 0n;
}
```

**Routes** (`backend/src/routes/sharing.ts`):

```ts
// PUT /:id
const updated = await updateSharedDeck(...);
if (!updated) {
  const existing = await getSharedDeck(c.get("db"), id);
  throw new HTTPException(existing ? 403 : 404, {
    message: existing
      ? "You do not have permission to update this share"
      : "Shared deck not found",
  });
}
return c.json({ status: "ok" });
```

Same shape for DELETE. For POST, wrap the insert:

```ts
import { isUniqueConstraintError } from "../db/queries/account-decks.ts";
// ...
try {
  await createSharedDeck(...);
} catch (error) {
  if (isUniqueConstraintError(error)) {
    throw new HTTPException(409, { message: "A share already exists for this deck id" });
  }
  throw error;
}
```

### Caveats

- **Order dependency with F7:** today `saveDeck` aborts entirely when
  `updateShare` throws. Turning silent no-ops into 403/404 will surface errors
  the frontend previously never saw. **Implement F7 first (or in the same
  change set)** so a failing share update cannot block local saves.
- Frontend `deleteAllShares` uses `Promise.all(...).catch(console.error)` and
  clears local state regardless — new 404s there are logged and harmless.
- `frontend/src/store/slices/sharing.ts` `deleteShare` will now throw on a
  share deleted elsewhere; wrap the specific 404 case: treat 404 as success
  (remove from `sharing.decks`) analogous to F4.
- `isUniqueConstraintError` matches `SQLITE_CONSTRAINT_PRIMARYKEY`, which is
  exactly what a duplicate `shared_deck.id` raises. Consider moving the helper
  to `backend/src/db/db.helpers.ts` since three modules will import it; if you
  move it, update the existing imports in `account-decks.ts` route and
  `account-campaigns.ts` route.

### Verification

- `npm run test -w backend`, `npm run check -w backend`,
  `npm run test -w frontend` (sharing slice tests), `npm run check -w frontend`.

### New tests (`backend/src/tests/sharing.spec.ts`)

1. PUT `/v2/public/share/nonexistent` with any valid deck body → 404.
2. PUT with a mismatching `X-Client-Id` (share created by another client, no
   account) → 403, and `getSharedDeck` still returns the original data.
3. DELETE with wrong client id → 403; row still present.
4. POST the same share twice → second responds 409, not 500.
5. Account-owner override still works: create share with client A while logged
   in, PUT with client B + same account's session cookie → 200.

---

## F7 — Local deck save is blocked when the share API is unreachable

**Severity:** Medium (local-first guarantee broken).
**File:** `frontend/src/store/slices/app.ts` — `saveDeck` (~line 436) and
`updateDeckProperties` (~line 360).

### Problem

Both actions `await state.updateShare(nextDeck)` **before** committing the
local `set(...)` update. `updateShare` (slice) performs a network PUT when the
deck is shared and throws on failure (`ApiError`, network error). So with the
API down or the client offline, saving edits or renaming a **shared** deck
fails outright — the local, offline-capable copy is held hostage by a remote
convenience feature. (Deck creation/`pushDeck` already does it right:
fire-and-forget with `.catch(console.error)`.)

### Fix

Move the share update **after** the local commit and make its failure
non-fatal but user-visible. In `saveDeck`:

```ts
// ...validation and nextDeck construction unchanged...

set((prev) => { /* unchanged local commit */ });

await dehydrate(get(), "app", "edits");

try {
  await state.updateShare(nextDeck);
} catch (error) {
  console.error("Failed to update share:", error);
  get().setToast?.({          // use the project's actual toast mechanism
    // i18n key exists already: deck_view.sharing.update_failed
  });
}
```

Notes for the implementer:

- Check how toasts are actually dispatched: `frontend/src/components/deck-display/hooks.ts`
  uses a `toast` helper with the `deck_view.sharing.*_failed` keys — reuse that
  pattern. If the store slice has no toast access, return a
  `{ shareUpdateFailed: boolean }` flag (or rethrow a typed error after the
  local commit) and let the calling component toast; **do not** hardcode UI
  strings in the slice.
- Apply the same reorder to `updateDeckProperties` (share update after `set`
  and `dehydrate`, non-fatal).
- Keep the existing behavior where `updateShare` is a no-op for unshared decks
  (`if (!state.sharing.decks[deck.id]) return;`).

### Caveats

- After this change a shared deck's remote copy can be stale relative to the
  local one. That is already true for `pushDeck` failures and is the correct
  local-first tradeoff. The `sharing.decks[id] = deck.date_update` map only
  updates on successful PUT, so "share is stale" remains detectable.
- `saveDeck` previously propagated share failures to its caller; grep for
  `saveDeck(` call sites and make sure none relied on that (as of `1fba8916`
  none do beyond generic error toasts).

### Verification

- `npm run test -w frontend`, `npm run check -w frontend`.

### New tests (`frontend/src/store/slices/app.spec.ts`)

1. Seed a shared deck (populate `sharing.decks[id]`), mock
   `PUT /v2/public/share/<id>` to return 500, call `saveDeck(id)` → resolves;
   `data.decks[id].date_update` advanced; `deckEdits[id]` cleared.
2. Same for `updateDeckProperties(id, { name: "x" })` → local rename applied.
3. Success path regression: share PUT 200 → `sharing.decks[id]` equals the new
   `date_update`.

---

## F8 — Deck validation accepts expert/role cards as outside interest

**Severity:** Medium (rules-correctness; the validator is the final arbiter of
`deck.problem`).
**Files:**
- `frontend/src/store/lib/deck-validation.ts` — `isCardAccessible`,
  `isOutsideInterest`, `isOutsideInterestCard` (~lines 256–324)
- Tests: `frontend/src/store/lib/deck-validation-er.spec.ts`

### Problem

Rulebook (`docs/rulebook.txt` line ~2869): the outside interest is a single
card from any specialty/background set, and **"The chosen card cannot be a
role or have the expert trait."**

The deck-create wizard filters both restrictions
(`selectDeckCreateOutsideInterestCards` in
`frontend/src/store/selectors/deck-create.ts`: `if (card.is_expert) return
false; if (card.type_code === "role") return false;`), but `validateDeck` —
which computes `deck.problem` after any later edit — enforces neither:

- `isOutsideInterestCard` treats **any** off-background/off-specialty card as
  an outside-interest candidate, including `is_expert` cards.
- `isCardAccessible` never rejects `type_code === "role"`; a role card whose
  `specialty_type` matches the deck's specialty would validate as an ordinary
  specialty pick if placed into `slots`.

So a deck edited outside the wizard can contain an expert outside interest (or
a role card in slots) and still be marked valid.

### Fix

In `deck-validation.ts`:

```ts
function isCardAccessible(card, background, specialty, deck) {
  const { category } = card;

  if (!category) return false;
  // Role cards live in specialty sets but are never deck slots — the deck's
  // role is tracked separately in `role_code`.
  if (card.type_code === "role") return false;

  // ...rest unchanged...
}

function isOutsideInterestCard(card, background, specialty) {
  // The rulebook forbids expert cards (and roles, handled above) as the
  // outside interest.
  if (card.is_expert) return false;
  if (card.type_code === "role") return false;
  if (card.category === "background" && card.background_type !== background)
    return true;
  if (card.category === "specialty" && card.specialty_type !== specialty)
    return true;
  return false;
}
```

Effect chain: an off-set expert card stops qualifying via
`isOutsideInterest` → `isCardAccessible` returns false → `validateCardAccess`
emits `FORBIDDEN` for it. Correct and no new error type needed.

### Caveats

- `countUniqueByCategory` (pick counting) counts off-set cards in `mismatches`
  without the expert check. Leave it: the deck is already FORBIDDEN-flagged,
  and mirroring the expert check there would report "0 outside interest picks"
  alongside, which is more confusing, not less. Add a code comment noting the
  intentional asymmetry.
- Confirm `is_expert` and `type_code` are populated on the resolved `Card`
  objects reaching validation (they are: `card.schema.ts` defines both;
  `buildql/fields.ts` and `selectors/lists.ts` already read `is_expert`).
- Existing decks that exploited the gap will flip to `problem: "invalid_cards"`
  after their next save. That is the desired behavior.

### Verification

- `npm run test -w frontend`, `npm run check -w frontend`.

### New tests (`frontend/src/store/lib/deck-validation-er.spec.ts`)

The file already has `mockCard` (default `is_expert: false`) and helpers.
Build a valid 30-card deck (copy an existing passing test) and then:

1. Replace the outside-interest card with
   `mockCard({ code, category: "background", background_type: "traveler", is_expert: true })`
   (deck background ≠ traveler) → expect `valid === false` and a `FORBIDDEN`
   error whose details include that code.
2. Add a role card
   `mockCard({ code, category: "specialty", specialty_type: <deck specialty>, type_code: "role" })`
   in slots → expect `FORBIDDEN`.
3. Regression: a non-expert off-background card as the single outside interest
   still validates.

---

## F9 — Email-existence oracles in resend-verification / forgot-password / login

**Severity:** Medium (account enumeration).
**Files:**
- `backend/src/routes/auth.ts` — `/resend-verification` (~line 224),
  `/forgot-password` (~line 257), `/login` (~line 116)
- `backend/src/lib/auth/assertions.ts` — `assertVerificationTokenCooldown`
- `backend/src/lib/auth/crypto.ts` — (new dummy-verify constant)

### Problem

Both `/resend-verification` and `/forgot-password` deliberately return a
uniform 200 whether or not the account exists — but the **cooldown** check
(`assertVerificationTokenCooldown`, which throws HTTP 429) only executes on
the account-exists branch. Probe twice within 5 minutes: registered email →
429, unregistered → 200. Clean boolean oracle.

Secondary: `/login` returns early (no scrypt call) when the email has no
identity, so response timing distinguishes registered emails (~100ms scrypt)
from unregistered (~1ms).

### Fix

1. **Uniform cooldown behavior:** in `/resend-verification` and
   `/forgot-password`, convert the cooldown from a thrown 429 into a silent
   skip, so the response is 200 in all cases:

```ts
// resend-verification
if (shouldResend) {
  const cooldownActive = await isVerificationTokenCooldownActive(
    c.get("db"), email, "email_verification",
  );
  if (!cooldownActive) {
    await sendVerificationEmail(/* unchanged */);
  }
}
return new Response(null, { status: 200 });
```

   Add to `assertions.ts`:

```ts
export async function isVerificationTokenCooldownActive(
  db: Database,
  email: string,
  tokenType: VerificationTokenType,
  cooldownMs = 5 * 60 * 1000,
) {
  const latestToken = await getLatestVerificationToken(db, email, tokenType);
  if (!latestToken) return false;
  return Date.now() < new Date(latestToken.created_at).getTime() + cooldownMs;
}
```

   Same change in `/forgot-password`. **Keep** the throwing
   `assertVerificationTokenCooldown` for the authenticated
   `PATCH /credentials` flow (there the caller is logged in; a 429 with
   `retryAfter` is good UX, not a leak).

2. **Login timing:** always burn one scrypt verification. In `crypto.ts` add a
   precomputed dummy hash (generate once, hardcode the string — format
   `salt:hex`), e.g.:

```ts
// Constant-format hash used to equalize login timing for unknown emails.
export const DUMMY_PASSWORD_HASH = "<output of await hashPassword('dummy') pasted here>";
```

   In `/login`:

```ts
const accountIdentity = await getAccountIdentityByEmail(db, email);
const passwordHash = accountIdentity?.password_hash ?? DUMMY_PASSWORD_HASH;
const passwordOk = await verifyPassword(password, passwordHash);

if (!accountIdentity?.password_hash || !accountIdentity.email || !passwordOk) {
  throw new HTTPException(401, { message: "Invalid email or password" });
}
```

### Caveats

- **Frontend impact:** check whether any UI depends on the 429 from
  resend/forgot (grep `retryAfter` and `429` under `frontend/src/pages/auth/`).
  If the UI showed "please wait before retrying", it now shows the generic
  success message — acceptable, but update copy if it explicitly promised an
  error. The uniform message should read like "If an account exists for this
  address, an email has been sent."
- Signup (`assertEmailAvailable` → 400 "already registered") also enumerates,
  but silently succeeding on signup is a UX minefield; leave signup as-is and
  rely on F5's rate limiting to blunt bulk enumeration. Note this explicitly
  in the commit message.
- The dummy verify roughly doubles worst-case login latency for unknown
  emails only. Fine.

### Verification

- `npm run test -w backend` — existing auth tests assert 429s from
  resend/forgot cooldowns (check `auth.spec.ts`); update those tests to expect
  200 + **no** second mail in `CaptureMailer` instead.

### New tests (`backend/src/tests/auth.spec.ts`)

1. Two immediate `POST /resend-verification` for a registered-unverified email
   → both 200, `ctx.mailer` captured exactly 1 message.
2. Two immediate `POST /resend-verification` for an unknown email → both 200,
   0 messages.
3. Same pair for `/forgot-password`.
4. `POST /login` with unknown email → 401 (behavioral guard; timing itself is
   not unit-testable).

---

## F10 — `complete-profile` can exceed SQLite's bound-variable limit

**Severity:** Medium (500 + aborted transaction on large-but-legitimate
uploads; cheap DoS).
**Files:**
- `backend/src/routes/auth.ts` — `createItemIdMap` (~lines 715–737)
- `shared/src/dtos/auth.schema.ts` — `CompleteProfileRequestSchema`
- `backend/src/lib/chunk-array.ts` — existing helper, reuse

### Problem

`/complete-profile` accepts up to 10 MB
(`COMPLETE_PROFILE_BODY_LIMIT_BYTES` in `backend/src/lib/body-limit.ts`) and
`createItemIdMap` runs `WHERE id IN (…)` with **one placeholder per uploaded
deck/campaign id**. SQLite's default max is 32,766 variables; a crafted (or
absurdly large but honest) backup with more items than that makes the query
throw mid-transaction → 500.

### Fix

1. **Bound the input** (primary): in `CompleteProfileRequestSchema`:

```ts
decks: z.array(SyncableDeckSchema).max(5000).optional(),
campaigns: z.array(SyncableCampaignSchema).max(1000).optional(),
```

   5000 decks × ~2 KB average is ~10 MB — consistent with the body limit.

2. **Chunk the lookup** (defense in depth) in `createItemIdMap`:

```ts
import { chunkArray } from "../lib/chunk-array.ts";
// ...
const existingIds = new Set<string>();
for (const chunk of chunkArray(ids, 500)) {
  const rows = await db
    .selectFrom(table)
    .select(["id"])
    .where("id", "in", chunk)
    .execute();
  for (const row of rows) existingIds.add(row.id);
}
```

3. Also chunk the **inserts** in `uploadAccountDecks` / `uploadAccountCampaigns`
   — each inserted row binds 6 values, so >~5,400 rows in a single
   `insertInto(...).values([...])` would also blow the limit. Loop
   `chunkArray(decks, 500)` and concatenate the `returning` rows.

### Caveats

- All of this runs inside one transaction already; chunking does not change
  atomicity.
- The uniqueness probe loop (`createUniqueItemId`) is per-colliding-id and
  fine as is.
- Mirror the new `.max()` bounds in any frontend pre-upload validation if it
  exists (grep `CompleteProfileRequestSchema` usages in `frontend/`); the
  schema lives in `shared` so the frontend picks it up automatically.

### Verification

- `npm run test -w backend`, `npm run test -w shared` (schema),
  `npm run check -w backend`, `npm run check -w frontend`.

### New tests

1. `backend/src/tests/auth.spec.ts` (or `account-sync.spec.ts`):
   complete-profile with 501 uploaded decks (procedurally generated minimal
   deck objects, unique ids) → 200; all decks retrievable via
   `/v2/account/sync/manifest` (proves chunked path works past one chunk).
2. Schema-level: 5001 decks → parse failure → 400.

---

## F11 — Concurrent signup race returns 500 instead of 400

**Severity:** Low.
**File:** `backend/src/routes/auth.ts` — `/signup` (~lines 84–114).

### Problem

`assertEmailAvailable` runs before (outside) the insert transaction. Two
concurrent signups for the same email can both pass the check; the loser hits
the unique index `idx_account_identity_provider_email` →
`SQLITE_CONSTRAINT_UNIQUE` → unhandled 500. Also reachable by racing signup
against a pending-email activation.

### Fix

Wrap the transaction and translate the constraint error:

```ts
try {
  await db.transaction().execute(async (tx) => { /* unchanged */ });
} catch (error) {
  if (
    error instanceof Error &&
    (error as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE"
  ) {
    throw new HTTPException(400, {
      message: "An account is already registered for this email",
    });
  }
  throw error;
}
```

(The message intentionally matches `assertEmailAvailable`'s.) Consider adding
a shared `isUniqueIndexConstraintError` helper next to
`isUniqueConstraintError` in `db.helpers.ts` — note the different code:
`SQLITE_CONSTRAINT_UNIQUE` (unique index) vs `SQLITE_CONSTRAINT_PRIMARYKEY`.

### Verification / tests

- `npm run test -w backend`.
- The race branch cannot be hit through the HTTP route in a test without
  mocking (a normal duplicate signup is caught earlier by
  `assertEmailAvailable` → 400), and DB mocking is forbidden. Test it in two
  parts instead:
  1. `backend/src/tests/auth-lib.spec.ts`: call `createAccount` twice with the
     same email against an in-memory DB; assert the second throws with
     `code === "SQLITE_CONSTRAINT_UNIQUE"` (proves the error shape the route
     translates).
  2. Extract the error translation into a named helper (e.g.
     `translateSignupConstraintError(error): never` at the bottom of
     `auth.ts`, or in `db.helpers.ts`) and unit-test it with a fabricated
     `Object.assign(new Error("x"), { code: "SQLITE_CONSTRAINT_UNIQUE" })` →
     expect an `HTTPException` with status 400.

---

## F12 — Admin API key: non-constant-time compare, no minimum length

**Severity:** Low.
**Files:** `backend/src/routes/admin.ts` (~line 11),
`backend/src/lib/config.ts` (`ADMIN_API_KEY`).

### Problem

`verifyToken: (token, c) => token === config.ADMIN_API_KEY` is a
character-by-character string compare (theoretical timing side channel), and
`ADMIN_API_KEY: z.string()` accepts `""` — an empty key in a misconfigured
deployment reduces the barrier to "send any Bearer header"… actually an empty
Bearer token never parses, but a 1-char key does.

### Fix

```ts
// admin.ts
import { timingSafeEqual } from "node:crypto";

function safeKeyCompare(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const adminKeyMiddleware = bearerAuth({
  verifyToken: (token, c: Context<HonoEnv>) =>
    safeKeyCompare(token, c.get("config").ADMIN_API_KEY),
});
```

Config: `ADMIN_API_KEY: z.string().min(16)`.

### Caveats

- **Deployment check before merging:** confirm the production/dev `.env`
  `ADMIN_API_KEY` is ≥16 chars, otherwise the server will fail to boot after
  this change. If unknown, log a startup warning instead of hard-failing
  (`.min(16)` stays but ship a note in the commit message).
- Test env: `backend` tests call `configFromEnv()`; check
  `backend/src/tests/test-setup.ts` / `vitest.config.ts` for the env values
  used and lengthen the test key if needed.

### Verification / tests

- `npm run test -w backend`. Existing admin tests (if any) keep passing; add:
  wrong-length key → 401; correct key → 201 on
  `POST /admin/fan_made_project_info`.

---

## F13 — `GET /cards/:code` turns every error into a 404

**Severity:** Low.
**File:** `backend/src/routes/cards.ts` (~lines 13–22).

### Problem

```ts
try {
  const card = await getCardByCode(c.get("db"), code);
  return c.json(card);
} catch {
  throw new HTTPException(404, ...);
}
```

`getCardByCode` ends in `executeTakeFirstOrThrow()`, which throws Kysely's
`NoResultError` for a missing card — but the bare `catch` also swallows real
failures (corrupt DB, disk I/O, a bug in `transformCard`) and mislabels them
404, hiding operational problems.

### Fix

```ts
import { NoResultError } from "kysely";
// ...
try {
  const card = await getCardByCode(c.get("db"), code);
  return c.json(card);
} catch (error) {
  if (error instanceof NoResultError) {
    throw new HTTPException(404, { message: `Card '${code}' not found.` });
  }
  throw error;
}
```

(Verify `getCardByCode` indeed uses `executeTakeFirstOrThrow`; if it uses
something else, adapt — the principle is "404 only on not-found".)

### Verification / tests

`backend/src/tests/cards.spec.ts`: unknown code → 404 (likely already
covered); no new test needed for the 500 path (hard to trigger without
mocking), rely on typecheck + review.

---

## F14 — CORS wildcard origins match any scheme

**Severity:** Low.
**File:** `backend/src/lib/cors.ts` — `originMatches` (~lines 44–49).

### Problem

For an allowlist entry `*.example.com`, `origin.endsWith(".example.com")`
matches `http://foo.example.com` as well as `https://…`. Combined with
credentialed CORS this reflects `Access-Control-Allow-Origin` to a plaintext
origin; an active network attacker on a victim's network could serve a page on
`http://sub.example.com` and ride the session cookie. Narrow, but free to fix.

### Fix

```ts
function originMatches(allowed: string, origin: string): boolean {
  if (allowed === origin) return true;
  if (!allowed.startsWith("*.")) return false;
  return origin.startsWith("https://") && origin.endsWith(allowed.slice(1));
}
```

### Caveats

- Local development uses exact entries like `http://localhost:3000` in
  `CORS_ORIGINS` — those go through the `allowed === origin` branch and keep
  working. Only *wildcard* entries become https-only. Say so in the commit
  message.

### Verification / tests

Add unit-style tests (export `originMatches` or test through `appFactory` with
a configured `CORS_ORIGINS="*.example.com"`): preflight from
`https://a.example.com` → allowed; `http://a.example.com` → no CORS headers.

---

## F15 — LIKE search does not escape `%` and `_`

**Severity:** Low (functional quirk, not injection).
**File:** `backend/src/db/queries/decklists.ts` — `name` and `tags` filters.

### Problem

`like '%' || ? || '%'` with user text means `%`/`_` in the query act as
wildcards: searching `100%` matches everything starting with `100`, `_`
matches any char. Parameterized, so no injection — purely wrong results.

### Fix

```ts
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
// usage:
q = q.where(
  sql`json_extract(data, '$.name')`,
  "like",
  sql`${`%${escapeLike(query.name)}%`} escape '\\'`,
);
```

If embedding `escape '\\'` through Kysely proves awkward, the equivalent raw
form is:
`sql`json_extract(data, '$.name') like ${pattern} escape '\\'``
used with `q.where(sql`...`)` as a whole-expression predicate.

### Verification / tests

Backend test: two shares named `100% Legit` and `100 Percent`; search
`name=100%` returns only the first.

---

## F16 — `decodeSearch` misreads plain-string values

**Severity:** Low (latent footgun; current callers are safe).
**File:** `shared/src/lib/search-params.ts` — `decodeSearch` (~lines 23–40).

### Problem

```ts
if (Array.isArray(value) && value.length > 1) {
  parsedParams[key] = value;
} else {
  parsedParams[key] = value[0];
}
```

The parameter type admits `string | string[]`. For a plain string `"hello"`,
the else branch evaluates `"hello"[0]` → `"h"`. The single current caller
(`parseDeckSearchQuery`) always wraps values in arrays, so this is not live —
but the signature invites the bug, and `schema.parse` also throws (uncaught)
on any invalid param in a user-editable URL.

### Fix

```ts
Object.entries(params).forEach(([key, value]) => {
  if (Array.isArray(value)) {
    parsedParams[key] = value.length > 1 ? value : value[0];
  } else {
    parsedParams[key] = value;
  }
});
```

Additionally make the browse page resilient: in `parseDeckSearchQuery`
(`frontend/src/store/services/requests/decklists-search.ts`), use
`schema.safeParse`-style handling — on failure return default filters
(`{ filters: {}, limit: 10, offset: 0 }`) instead of letting the page crash on
a malformed/bookmarked URL (this becomes reachable once F2 tightens the
schema).

### Verification / tests

This is the excuse to make `npm run test -w shared` real (see F19): add
`shared/src/lib/search-params.spec.ts` covering: plain string passthrough,
1-element array unwrap, multi-element array, and `encodeSearch` round-trip.

---

## F17 — `deleteDeck` crashes on a missing deck id

**Severity:** Low.
**File:** `frontend/src/store/slices/app.ts` — `deleteDeck` (~lines 242–252).

### Problem

```ts
const deck = state.data.decks[id];
const historyEntries = state.data.history[id] ?? [];
await Promise.allSettled(
  [...historyEntries, deck.id].map(...)   // ← TypeError if deck undefined
);
```

A stale route, double-click, or cross-tab deletion race throws instead of
no-oping.

### Fix

```ts
const deck = state.data.decks[id];
if (!deck) return;
```

(Or `assert(deck, ...)` if a loud failure is preferred — but the surrounding
slice style uses `assert` for programmer errors and this is a user-race, so a
silent return is more appropriate.)

### Verification / tests

`app.spec.ts`: `await store.getState().deleteDeck("nonexistent")` resolves
without throwing and leaves state unchanged.

---

## F18 — `deck_limit: 0` is treated as limit 2 in validation

**Severity:** Low (data-dependent; currently theoretical).
**File:** `frontend/src/store/lib/deck-validation.ts` — `validateCardLimits`
(~line 215); `frontend/src/utils/card-utils.ts` — `cardLimit`.

### Problem

`cardLimit(card)` returns `card.deck_limit ?? 0`, and the validator does
`cardLimit(card) || DECK_CARD_COPIES` — so both "no deck_limit" **and**
"deck_limit explicitly 0" fall through to 2. A future card with
`deck_limit: 0` (not deck-legal) would validate at 2 copies.

### Fix

```ts
const limit = card.deck_limit ?? DECK_CARD_COPIES;
```

(Keep `cardLimit` itself unchanged — other call sites rely on its
`?? 0` default; only the validator's fallback is wrong.)

### Caveats

- First verify no current card data has `deck_limit: 0` meaning "use default":
  `sqlite3 <db> "select code,name,deck_limit from card where deck_limit = 0"`
  — if any rows exist, investigate the ingest pipeline
  (`backend/src/scripts/ingest-cards.ts`) before changing semantics.

### Verification / tests

Add to `deck-validation-er.spec.ts`: card with `deck_limit: 0` at quantity 2 →
`INVALID_CARD_COUNT` with `limit: 0`; card with `deck_limit: 1` at 2 →
violation (probably already covered); card with `deck_limit` unset at 2 → ok.

---

## F19 — `shared` workspace test script runs zero tests

**Severity:** Low (process gap).
**Files:** `shared/` workspace; `shared/vitest.config.ts`.

### Problem

`npm run test -w shared` exits 0 with "No test files found". CLAUDE.md lists
it as a standard check, so it silently vouches for code it never tests —
including `search-params.ts` (F16) and the sync-id refinement logic in
`sync.schema.ts`.

### Fix

Add real tests:

- `shared/src/lib/search-params.spec.ts` (cases in F16).
- `shared/src/dtos/sync.schema.spec.ts`: `SyncableDeckSchema` rejects a 65-char
  id and accepts a 64-char one; `ItemBatchRequestSchema` rejects >250 ids.
- `shared/src/dtos/auth.schema.spec.ts`: `CanonicalEmailSchema` trims and
  lowercases; F10's new `.max()` bounds reject oversized upload arrays.

If instead the decision is "shared has no tests by design", remove the test
script from `shared/package.json` and the reference from
CLAUDE.md/AGENTS.md/GEMINI.md (all three must stay in sync). Prefer adding the
tests.

### Verification

`npm run test -w shared` reports >0 passing tests.

---

## Implementation order

Recommended sequence (respects the F6→F7 dependency and groups related work):

1. **F3, F4, F17** — small, self-contained frontend store fixes.
2. **F2** (+ the `parseDeckSearchQuery` hardening from F16) — public 500s.
3. **F7 then F6** — share robustness (F7 must land first or together).
4. **F1** — share visibility (needs the F6 groundwork anyway; largest change).
5. **F5, F9, F11, F12** — auth hardening batch.
6. **F8, F18** — validation correctness batch.
7. **F10, F13, F14, F15, F16, F19** — remainder.

After each batch: `npm run lint`, `npm run check -w frontend`,
`npm run check -w backend`, `npm run test -w backend`,
`npm run test -w frontend`, `npm run test -w shared`, and
`npm run build -w frontend` before the final commit of the series.

## Explicit non-findings (checked, no action)

Recorded so future audits don't re-litigate them:

- **XSS:** all `dangerouslySetInnerHTML` sites route through
  `parseMarkdown` → `DOMPurify.sanitize` (or sanitize inline, e.g. FAQ). Safe.
- **Session/token storage:** session tokens and verification tokens are stored
  hashed (SHA-256); cookies are httpOnly + SameSite=Strict + secure in prod.
- **Password hashing:** scrypt with per-user salt and `timingSafeEqual`
  compare.
- **Optimistic concurrency:** deck/campaign/blob writes are revision-guarded
  end to end; the frontend rekey-on-409 path (`pushDeck`) correctly handles
  cross-account id collisions, which also makes global `account_deck` id
  squatting a nuisance rather than a denial (ids are 15-char nanoids).
- **`shared_deck` count query:** the Kysely builder is immutable, so the
  `total` count correctly excludes limit/offset.
- **`upsertBlob` fabricated-revision edge in `complete-profile` uploads**
  (`onConflict.doNothing` + returning a fresh revision that was never stored):
  unreachable today because `completeAccountProfile` guards double completion
  at the SQL level. Worth remembering if profile completion ever becomes
  re-runnable.
