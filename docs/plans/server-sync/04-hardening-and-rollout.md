# Phase 4 — Hardening, edge cases, docs, rollout

Follow-ups that make sync safe to leave enabled long-term. 4.1 and 4.2 should
land before announcing the feature; the rest can trail.

## Task 4.1 — Persist-schema version skew

The frontend's persisted-state schema has a version (`VERSION` in
`frontend/src/store/persist/storage.ts`, currently 15) with migrations in
`persist/migrations/`. Two devices on different app versions must not corrupt
each other's data:

- Every pushed entity carries `schema_version` (already in the phase-1 schema).
- **Pulling newer:** if a pulled entity's `schema_version` > local `VERSION`,
  do not apply it and do not mark it synced; set a `sync.blockedByVersion`
  flag that the UI surfaces as "update the app to continue syncing".
  Never LWW-overwrite a newer-schema server copy with an older-schema local
  one (treat it as remote-wins-and-defer).
- **Pulling older:** run the pulled envelope through the persist migration
  chain before applying. The existing migrations operate on whole-state
  partials (see `persist/migrate.ts`); add a small adapter that wraps a single
  envelope in a synthetic partial state, migrates, and unwraps. Add a unit
  test per future migration that touches deck/campaign shapes.

This is the subtlest part of the whole feature — it gets its own vitest specs.

**Permanent constraint this introduces (document in the repo agent guides,
mirrored across `CLAUDE.md`/`AGENTS.md`/`GEMINI.md` per the sync-files
rule):** from the first sync release onward, persist migrations that touch
decks, campaigns, or folders must be expressible **per entity** — a
migration may not need to read one entity to rewrite another. Cross-entity
migrations would break the single-envelope migration adapter and strand
mixed-version devices.

## Task 4.2 — Starter-deck duplication

`mergeInitialState` in `frontend/src/store/slices/app.ts` seeds three starter
decks with `randomId()` ids on every fresh browser profile. Two linked devices
would each contribute their own trio → six "starter" decks after first sync.

Fix in two parts:

1. Give starter decks deterministic ids in
   `frontend/src/store/lib/predefined-decks.ts` (e.g. `starter-<role>`), so
   fresh devices collide on id and merge cleanly via LWW. Existing profiles
   keep their random-id copies (`starterDecksSeeded` prevents re-seeding);
   that's acceptable.
2. In the first-sync merge, skip pushing a local starter deck that is
   *untouched* (`date_update === date_creation`) when the server already has
   an untouched starter for the same role. Heuristic, but it only ever skips
   pristine seeded decks.

## Task 4.3 — Abuse guards on accounts (`server` provider only)

**Prerequisite for announcing the feature** (see phase 1 Task 1.3): with
username/password-derived credentials, online guessing is a real attack in a
way it wasn't with random tokens. For a small self-hosted service:

- per-IP rate limit on `POST /v2/sync/account` (unauthenticated) **and** on
  failed auth across all sync routes — lock out an IP for a cooldown after
  ~10 consecutive 401s (simple in-memory token bucket in a Hono middleware is
  fine at this scale; no new infra). The client-side 600k-iteration PBKDF2
  slows offline cracking of a leaked DB, not online guessing — only rate
  limiting does that.
- optional `SYNC_MAX_ACCOUNTS` / `SYNC_MAX_ENTITIES_PER_ACCOUNT` env caps read
  via `backend/src/lib/config.ts`, returning 429/413 with clear messages
- a tiny cleanup script in `backend/src/scripts/` that deletes accounts with
  zero entities and `last_seen_at` older than N days (run manually or via
  the host's cron; this repo deliberately has no background workers)

## Task 4.4 — Payload size sanity (`server` provider)

A deck envelope is a few KB; pathological `description_md` can be hundreds of
KB. The global body limit is 500 KB (`backend/src/lib/body-limit.ts`). Add a
server-side per-entity size cap (e.g. 256 KB) with a distinct error message so
one giant deck fails loudly instead of wedging the whole batch, and make the
client's push chunker fall back to smaller batches on 413.

## Task 4.5 — Documentation

- `docs/api.md` — `/v2/sync/*` endpoints, auth scheme, env vars from 4.3.
- `docs/architecture.md` — replace the "most user data lives in the browser"
  paragraph with the sync model (local-first, remote replica per provider,
  LWW), and note
  which state is *not* synced.
- `docs/deployment.md` — nothing new expected (same SQLite file), but confirm
  and note backup implications: the server DB now holds user data worth
  backing up.
- If agent-relevant behavior changes (e.g. "never test sync against the
  production DB"), update `CLAUDE.md` **and mirror to `AGENTS.md` /
  `GEMINI.md`** per the sync-files rule.

## Task 4.6 — Rollout order

0. Deploy order within any release: backend before frontend, always — the
   sync routes are additive, so an old frontend against a new backend is
   fine; a new frontend against an old backend would 404 on connect.
1. Land phase 1 (server-provider backend) — inert without a client.
2. Land phase 2 + 3 together behind the opt-in (sync is off unless a user
   enables it, so no flag machinery needed beyond `sync.enabled`).
3. Enable on the dev instance (dev.harababurel.com), run the two-context
   manual pass from phase 2/3, let it soak with the owner's real collection.
4. 4.1/4.2 (and 4.3 for any deployment offering the `server` provider
   publicly) before announcing; 4.4–4.5 as follow-ups.
5. Phase 5 (`google-drive`) after the engine has soaked on the server
   provider. Start Google's app verification (doc 05 Task 5.1) well before —
   it is the schedule risk, not the code. The hosted instance flips to
   `VITE_SYNC_PROVIDERS="google-drive"` only once verification clears.

Rollback story: disabling sync client-side reverts the app to pure-local
behavior; the server tables are additive and can sit unused. No destructive
migrations anywhere in the plan.

**Existing users:** the rollout is invisible unless they opt in. On first
load after the release they hit the routine persist `VERSION` bump (same
mechanism as the previous 15 versions) which seeds an empty, disabled sync
state — no data is touched, nothing is uploaded. Users who do opt in go
through the phase-2 first-sync merge, which is exactly the "upload my
existing collection" path. Switching providers later (e.g. an instance
moving from `server` to `google-drive`) is a manual disable + reconnect —
local data is the source of truth throughout, so nothing is lost, but there
is no automated provider-to-provider migration.

## Explicit non-goals (recorded so they don't creep in)

- Field-level merge / CRDTs
- Real-time push (WebSocket/SSE) — pull-on-focus is enough for the use case
- Syncing `deckEdits`, `undoHistory`, `settings`, `achievements` (candidate
  later entity types; the schema supports adding types without migration)
- Password reset / change — there is no email on file, so a forgotten
  password means creating a new account under a new username and re-uploading
  (local data is never at risk; this is a replica, not the source of truth).
  A password *change* would need a re-keying endpoint (new `account_id` +
  `token_hash`, entities moved across) — deliberately deferred.
- Server-visible usernames — the server stores only a hash of the username,
  so it cannot list or recover account names
