# Phase 1 — `server` provider backend: schema, sync API, tests

Goal: a complete, tested sync API that a client can push entity batches to and
pull ordered changes from, with token auth and per-entity compare-and-set.

Scope note: this phase is the **self-hosting** sync backend. The hosted
deployment uses the `google-drive` provider (doc 05) and does not store user
data server-side; a hosted instance simply ships with these routes unused
(or disabled via `VITE_SYNC_PROVIDERS` on the frontend build).

No frontend changes in this phase.

## Task 1.1 — Database migration

New dbmate migration `backend/src/db/migrations/<timestamp>_add_sync.sql`
(follow the up/down format of `20260422020000_add_shared_decks.sql`):

```sql
-- migrate:up

CREATE TABLE sync_account (
  id TEXT PRIMARY KEY,                -- derived client-side from the username
  token_hash TEXT NOT NULL,           -- sha256 of the client-derived token
  next_seq INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_seen_at TEXT
);

CREATE TABLE sync_entity (
  account_id TEXT NOT NULL REFERENCES sync_account(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,          -- 'deck' | 'campaign' | 'folder'
  entity_id TEXT NOT NULL,
  revision INTEGER NOT NULL,          -- per-entity, starts at 1
  seq INTEGER NOT NULL,               -- account-scoped change sequence
  deleted INTEGER NOT NULL DEFAULT 0, -- tombstone
  data TEXT,                          -- JSON envelope; NULL when deleted
  schema_version INTEGER NOT NULL,    -- frontend persist VERSION at write time
  client_date_update TEXT,            -- entity's own date_update (LWW input)
  updated_at TEXT NOT NULL,
  PRIMARY KEY (account_id, entity_type, entity_id)
);

CREATE INDEX idx_sync_entity_account_seq ON sync_entity(account_id, seq);

-- migrate:down

DROP INDEX IF EXISTS idx_sync_entity_account_seq;
DROP TABLE IF EXISTS sync_entity;
DROP TABLE IF EXISTS sync_account;
```

Notes:

- `next_seq` lives on the account row; every accepted write copies it to the
  entity and increments it inside the same transaction. `better-sqlite3` is
  a synchronous single-writer, so this is race-free.
- `data` stores the *envelope* (see Task 1.2), not the bare document, so the
  server never needs to understand entity internals beyond validation.
- Add the generated `schema.sql` changes and `Kysely` types in
  `backend/src/db/schema.types.ts` (mirror how `SharedDeck` is declared).

**Verify:** `npm run migrate -w backend` (or the dbmate command used in this
repo) applies and rolls back cleanly; `npm run check -w backend` passes.

## Task 1.2 — Shared DTOs (`shared/`)

New file `shared/src/dtos/sync.schema.ts` (+ export from the package index):

```ts
export const SyncEntityTypeSchema = z.enum(["deck", "campaign", "folder"]);

// Envelopes: what `data` contains per entity type.
export const DeckEnvelopeSchema = z.object({
  deck: DeckSchema,
  history: z.array(idSchema).default([]),   // data.history[deck.id]
  folder_id: z.string().nullish(),          // data.deckFolders[deck.id]
});
export const CampaignEnvelopeSchema = z.object({ campaign: CampaignSchema });
export const FolderEnvelopeSchema = z.object({
  folder: z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string().nullish(),
    color: z.string().nullish(),
    parent_id: z.string().nullish(),
  }),
});

export const SyncPushRequestSchema = z.object({
  entities: z.array(z.object({
    type: SyncEntityTypeSchema,
    id: z.string(),
    base_revision: z.number().nullable(), // null = client believes it's new
    deleted: z.boolean().default(false),
    schema_version: z.number(),
    date_update: z.string().nullish(),
    data: z.unknown().nullish(),          // validated per-type server-side
  })).max(50),
});

export const SyncPushResponseSchema = z.object({
  results: z.array(z.object({
    type: SyncEntityTypeSchema,
    id: z.string(),
    status: z.enum(["ok", "conflict"]),
    revision: z.number(),
    seq: z.number(),
    // present on conflict so the client can resolve without a second request:
    current: z.unknown().nullish(),
    current_deleted: z.boolean().nullish(),
    current_date_update: z.string().nullish(),
    current_schema_version: z.number().nullish(),
  })),
  cursor: z.number(), // account's latest seq after this push
});

export const SyncChangesResponseSchema = z.object({
  changes: z.array(z.object({
    type: SyncEntityTypeSchema,
    id: z.string(),
    revision: z.number(),
    seq: z.number(),
    deleted: z.boolean(),
    schema_version: z.number(),
    data: z.unknown().nullish(),
  })),
  cursor: z.number(),
});
```

Rationale for the deck envelope sidecar: `data.history` and `data.deckFolders`
are per-deck facts stored in store-level maps. Folding them into the deck's
envelope localizes conflicts to one deck instead of one giant map entity that
would lose data under LWW.

**Deck-share markers (`sharing.decks`) are deliberately NOT synced.** Public
shares are owned by the `clientId` of the device that created them
(`X-Client-Id` on `/v2/public/share`), and that ownership stays per-device: a
local deck has a single link to its shared deck, held by one device. Syncing
the marker would make other devices call `updateShare` and fail silently
(the `client_id` WHERE clause matches zero rows). Accepted consequence: a
public share only refreshes when the *owning* device saves the deck — edits
synced in from other devices don't update it until then. Revisit only if
users actually hit this.

**Verify:** `npm run test -w shared`, `npx biome check shared/src/dtos/sync.schema.ts`.

## Task 1.3 — Credential scheme, account claim & auth middleware

New `backend/src/routes/sync.ts` + `backend/src/db/queries/sync.ts`
(follow the shapes of `routes/sharing.ts` / `db/queries/sharing.ts`).

**Credentials are derived client-side from username + password** — the server
never sees either, only the derived values:

```
username_norm = NFKC(trim(lowercase(username)))
account_id    = base64url(sha256("ebs-account:" + username_norm))
token         = base64url(PBKDF2-SHA256(password,
                  salt = "ebs-token:" + username_norm,
                  iterations = 600_000, 32 bytes))
```

- Deterministic: the same credentials on any device produce the same
  `account_id` + `token`, which is what makes the account recoverable and
  shareable — there is nothing device-specific to transfer.
- The slow KDF runs in the browser (WebCrypto has PBKDF2 built in; the
  derivation helper is a phase-2 task). The server treats `token` as an
  opaque bearer secret and stores only `sha256(token)` in `token_hash`, so a
  DB leak still requires brute-forcing the password through the KDF.
- The plaintext username is **not** stored server-side; `account_id` is a
  one-way hash of it.

Wire format stays a single bearer string: `ebs_<account_id>.<token>`.

Endpoints:

- `POST /v2/sync/account` — no auth. Body `{ account_id, token }`. **Claims**
  the account id: `201` on success, `409` if the id already exists — even
  when the token hash matches. Create must never behave as a silent login;
  the distinct error is what lets the UI keep "create" and "link" honest
  (a typo'd username on the link path must not spawn an empty account).
- `GET /v2/sync/account` — auth. Returns `{ account_id, created_at, entity_counts, cursor }`.
  Doubles as the **login/link check**: the client calls it after deriving
  credentials and treats 401 as "unknown username or wrong password"
  (deliberately indistinguishable).
- `DELETE /v2/sync/account` — auth. Deletes the account and all entities
  (cascade). Client calls this from "Disable sync & delete server data".

Auth middleware (local to the sync router): parse `Authorization: Bearer`,
split account id and token, load account, constant-time-compare
`sha256(token)` against `token_hash`, 401 on any mismatch,
`c.set("syncAccount", account)`, update `last_seen_at` (throttled — at most
once per minute — to avoid a write per request).

Because username/password pairs are guessable in a way random tokens were
not, the failed-auth rate limiting in phase 4 (Task 4.3) is a prerequisite
for announcing the feature, not an optional hardening.

**Verify:** covered by Task 1.6 tests; `npm run check -w backend`.

## Task 1.4 — Pull endpoint

`GET /v2/sync/changes?since=<cursor>&limit=<n>` (auth):

- Selects `sync_entity` rows for the account with `seq > since`,
  ordered by `seq`, limited (default 200). Tombstones return
  `deleted: true, data: null`.
- Response is `SyncChangesResponseSchema`; `cursor` is the max seq returned
  (or `since` when empty). The client pages until `changes.length < limit`.

## Task 1.5 — Push endpoint

`POST /v2/sync/push` (auth), body `SyncPushRequestSchema`:

For each entity, inside one transaction per request:

1. Validate `data` against the matching envelope schema (skip when `deleted`).
   400 on invalid payloads (mirror `routes/sharing.ts` error style).
2. Load the current row.
   - No row and `base_revision === null` → insert with `revision = 1`.
   - Row exists and `base_revision === row.revision` → update,
     `revision + 1`.
   - Otherwise → `status: "conflict"`, include the server's current copy
     in the result; **do not** write.
3. Accepted writes take `seq = account.next_seq` and increment it.
4. Deletes are updates with `deleted = 1, data = NULL` (keep `revision`
   semantics identical). A delete for a row that never existed is treated
   as `ok` (idempotent).

Batch size is capped at 50 entities per request; with decks around 2–4 KB of
JSON this stays comfortably under the 500 KB `bodyLimitMiddleware` cap
(`backend/src/lib/body-limit.ts`). The client chunks larger sets (see phase 2;
`backend/src/lib/chunk-array.ts` exists for the server side if needed).

Wire the router in `backend/src/app.ts`. Sync routes are authenticated and
account-scoped, so mount them at `app.route("/v2/sync", syncRouter)` rather
than under `/v2/public`.

## Task 1.6 — Backend integration tests

New `backend/src/tests/sync.spec.ts` using the existing in-memory-SQLite
fixture (`backend/src/tests/test-utils.ts`) — no DB mocking, per repo policy.

Cases (minimum):

- account claim → push new deck → pull from cursor 0 returns it; cursor advances.
- claiming an already-claimed `account_id` → 409, including with an identical
  token (create is never a login).
- `GET /v2/sync/account` with the right token → 200 with counts; with a wrong
  token or unknown account id → 401 (same status for both).
- push with stale `base_revision` → `conflict` result containing the current
  server copy; server state unchanged.
- tombstone push → pull returns `deleted: true`; re-pushing the delete is `ok`.
- pagination: >limit changes are returned across pages in seq order.
- auth: missing/garbage/wrong-account token → 401; account A cannot read or
  write account B's entities.
- envelope validation: malformed deck payload → 400, nothing written.
- `DELETE /v2/sync/account` removes entities (pull with a stale token → 401).

**Verify (phase gate):**

```
npm run check -w backend
npm run test -w backend
npm run test -w shared
```

Then update `docs/api.md` with the new endpoints (or defer to phase 4's docs
task, but don't ship the phase without it queued).
