# Account system port — execution plan

Status: **phase 5 complete**
Created: 2026-07-07
Reference implementation: `/home/sergiu/work/arkham.build` (must exist locally; see §1.2)

---

## 1. How to use this document

This plan describes, phase by phase, how to port the user-account and cloud-sync system
from arkham.build into earthborne.build. It is written to be executed by an AI agent with
the project owner (Sergiu) available for assistance.

Rules for the executing agent:

1. **Execute phases strictly in order.** Do not start a phase before the previous phase's
   checkpoint is fully green. Do not invent extra scope.
2. **Every phase ends with a checkpoint.** Run the listed verification commands. All must
   pass. Then stop and ask Sergiu to confirm before continuing to the next phase.
3. **Track progress in this file.** When a task is done, change its `[ ]` to `[x]` and
   commit the plan file together with the task's code changes. Update the `Status:` line
   at the top when a phase completes (e.g. `Status: phase 3 complete`).
4. **When a task says "Reference:", open and read that arkham.build file before writing
   any code.** The reference files are working, tested implementations. Your default mode
   is: read reference → copy → adapt (rename brands, change DB dialect, remove dropped
   features). Do not redesign from scratch.
5. **When something is ambiguous, ask Sergiu.** Do not guess on product behavior.
6. **Never run the dev server** (`npm run dev`, vite, backend `main.ts`). Sergiu runs his
   own dev instance at `https://dev.harababurel.com`. Verification is done through
   automated tests and typechecks only, plus manual QA by Sergiu at the checkpoints that
   call for it.
7. **Commit at the end of every task or small group of related tasks.** Stage specific
   files (never `git add -A`). Write commit messages like a human
   (e.g. `feat: add account tables migration`). **Never** add `Co-Authored-By` or any
   AI-attribution trailer.

### 1.1 Verification commands (used throughout)

Run from the repo root (`/home/sergiu/work/earthborne.build`):

```bash
npm run check -w backend        # backend typecheck
npm run test -w backend         # backend tests (vitest, real in-memory SQLite)
npm run check -w frontend       # frontend typecheck
npm run build -w frontend       # frontend production build
npm run test -w frontend        # frontend unit tests
npm run test -w shared          # shared package tests
npx biome check <changed files> # lint specific files
npm run lint                    # lint everything
```

`node`, `npm`, `npx` are system packages on PATH on this host. Do not prefix with
`eval "$(fnm env)"`.

### 1.2 Reference repository

The reference is the local checkout `/home/sergiu/work/arkham.build`. The account system
landed in commit `4f7ad84b` ("feat: add user accounts (#400)") plus ~15 follow-up fixes.
**Always read files at the current HEAD of that repo**, not at the commit — the follow-ups
fixed real bugs (sync reconciliation id handling, token refresh, etc.) and one follow-up
(`73317ba7`) removed the frontend provider-adapter layer, which we also don't want.

The two repos share **no git history**. Nothing can be cherry-picked. Every port is
manual: read the arkham file, recreate it in earthborne, adapt.

Naming: arkham imports from `@arkham-build/shared`; earthborne's equivalent is
`@earthborne-build/shared`. Arkham's frontend aliases `@/` the same way earthborne does.

### 1.3 Delegation guide (for Sergiu)

Tasks vary in how much judgment they demand. Assign agents by tier; when in doubt, use
a stronger agent. Prefer giving one agent a whole phase (context continuity beats
per-task optimization) — the tier of a phase is the tier of its hardest task unless you
split it.

**Tier A — mechanical.** Verbatim copies, spec-is-the-code tasks, doc updates. A basic
agent following instructions literally will succeed; the checkpoint catches failures.

> 0.2, 0.3, 0.4, 0.5, 1.1 (the DDL is written out — transcription only), 1.2, 2.1,
> 2.4, 2.6, 2.7, 5.4, 7.2, 9.4, 10.1, 10.2, 10.3

**Tier B — guided porting.** Read a working reference file, apply systematic
transformations (§4 dialect table, drop listed features), write enumerated tests. Needs
an agent that can adapt code, not just copy it, but every decision is pre-made in this
plan.

> 1.3, 1.4, 1.5, 2.2, 2.3, 2.5, 2.8, 3.1, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4,
> 5.1, 5.2, 5.3, 6.1, 6.2, 6.5, 6.7, 7.1, 7.3, 7.4, 8.1, 8.6, 8.9, 8.10, 9.1, 9.2, 9.3

**Tier C — judgment required.** Merging into diverged code, transaction/remapping
logic, reconciliation semantics, choosing instrumentation points. Use your strongest
agent and review its diffs yourself; expect iteration.

> 3.2 (complete-profile transaction + id remapping), 6.3, 6.4, 6.6, 7.5 (QA — you drive),
> 8.2, 8.3, 8.4, 8.5, 8.7, 8.8, 10.4 (QA — you drive)

**Special instruction for Phase 8:** before anyone executes tasks 8.4/8.5, have a
Tier-C agent do a *decomposition pass* — read `frontend/src/store/slices/app.ts`,
`data.ts`, `campaigns.ts`, `achievements.ts`, and the deck-edit save path as they exist
at that time, and append an addendum to this plan enumerating every mutation site
(function name, file, what to insert where). That converts 8.4/8.5 into Tier-B work.
Do not do this now — Phases 6–7 reshape the store first, and main moves under this plan.

---

## 2. Locked decisions (do not revisit)

These were decided with Sergiu on 2026-07-07. Treat them as constraints:

1. **SQLite stays.** No Postgres. All arkham Postgres-isms get SQLite equivalents (§4).
2. **Campaigns and achievements are account-synced.**
   - Campaigns sync **per-item** exactly like decks (own server table, manifest entries,
     revision-based conflict detection).
   - Achievements are a single global blob per account (they are rulebook achievements,
     `Record<AchievementId, ...>` — not per-campaign). They sync like folders/settings:
     one revisioned row per account.
3. **Mirror-everything sync policy.** While logged in, ALL local decks, campaigns,
   folders, settings, and achievements sync to the account. There is no per-item
   "local vs account" storage choice:
   - Onboarding (complete-profile) uploads all existing local data.
   - Items created/edited while logged in push automatically.
   - Local-only items discovered at login bootstrap are auto-uploaded.
   - Logout clears account data from the device (it lives on the server).
   - The existing `defaultStorageProvider` setting (arkham residue) is removed.
4. **Account-owned publishing.** New deck shares are linked to the publishing account
   (nullable `account_id` on `shared_deck`). Existing anonymous client-id shares keep
   working via their URLs. Claiming old shares into an account is **out of scope**.
5. **Dropped from arkham entirely:** ArkhamDB OAuth + API client + snapshots + multi-
   provider sync, pg-boss job queue, `account-migration` page, legacy API compat,
   moderation/ban system (v2 — the DB columns for it are also omitted), admin account
   endpoints (v2), deck upgrade endpoint (ER has no XP deck upgrades).
6. **Kept:** scrypt password hashing, hashed opaque session cookies, typed verification
   tokens, revisioned optimistic-concurrency writes, complete-profile onboarding with
   local-data upload + id remapping, Cloudflare Turnstile captcha (optional — disabled
   when the secret is unset), email verification + password reset over SMTP.

---

## 3. Target architecture overview

### 3.1 New database tables (SQLite)

All ids are UUIDs generated in application code via `crypto.randomUUID()`. All timestamps
are ISO-8601 strings from `new Date().toISOString()` (this matches the existing
`shared_deck` convention). All JSON payloads are stored as TEXT.

The full migration DDL is specified in Task 1.1. Summary:

| Table | Purpose | Key columns |
|---|---|---|
| `account` | one row per user | `id`, `name` (unique, case-insensitive), `profile_completed_at`, `last_activity_at` |
| `account_identity` | login credentials (provider always `'email'` for now) | `account_id`, `provider`, `email`, `password_hash`, `pending_email`, `verified_at` |
| `session` | server-side sessions | `account_id`, `token_hash` (unique), `expires_at`, `last_activity_at` |
| `verification_token` | email-verification + password-reset tokens | `account_identity_id`, `email`, `token_hash`, `token_type`, `expires_at` |
| `account_deck` | synced decks, full Deck DTO as JSON blob | `id`, `account_id`, `revision`, `data`, `updated_at` |
| `account_campaign` | synced campaigns, full Campaign DTO as JSON blob | `id`, `account_id`, `revision`, `data`, `updated_at` |
| `account_folder` | folders blob (`{folders, deckFolders}`) | `account_id` (PK), `revision`, `state` |
| `account_settings` | settings blob | `account_id` (PK), `revision`, `settings` |
| `account_achievements` | achievements blob | `account_id` (PK), `revision`, `state` |
| `shared_deck` (altered) | + nullable `account_id` | |

### 3.2 New API surface

All under the existing Hono app. Public routes keep the current CORS middleware; account
routes get a credentialed CORS variant (Task 3.6).

Auth — mounted at `/v2/account/auth`:

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/signup` | — | create account+identity, send verification email. Body: `{email, password, captchaToken?}` → 201 |
| POST | `/login` | — | verify credentials → set session cookie. 401 invalid, 403 unverified |
| POST | `/logout` | session | delete session, clear cookie |
| POST | `/verify-email` | — | consume `email_verification` token; also activates `pending_email` changes |
| POST | `/resend-verification` | — | re-send verification (cooldown-limited; always 200 to avoid enumeration) |
| POST | `/forgot-password` | — | send `password_reset` token (always 200) |
| POST | `/reset-password` | — | consume token, set new password, delete all sessions |
| GET | `/me` | session (profile not required) | session/account/identity info |
| PATCH | `/credentials` | session | change email (→ `pending_email` + verification) and/or password (requires current password) |
| DELETE | `/credentials/pending-email` | session | cancel pending email change |
| DELETE | `/` | session | delete account (cascades everything) |
| POST | `/complete-profile` | session (profile not required) | set username + bulk-upload local data. See §3.4 |

Profile — mounted at `/v2/account/profile`:

| Method | Path | Auth | Purpose |
|---|---|---|---|
| PATCH | `/` | session | rename account (username uniqueness enforced) |

Sync — mounted at `/v2/account/...`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/sync/manifest` | `{decks: ManifestItem[], campaigns: ManifestItem[]}` where `ManifestItem = {id, revision, updatedAt}` |
| POST | `/decks/batch` | body `{ids: string[]}` (max 250) → `{decks: [{data, revision, updatedAt}]}` |
| POST | `/decks` | body `{data: Deck}` → 201 `{revision}`; 409 if id already exists |
| PUT | `/decks/:id` | body `{data: Deck, expectedRevision}` → `{revision}`; 409 → `{data, revision}` (current server state); 404 if absent |
| DELETE | `/decks/:id` | body `{expectedRevision}` → 200; 409 → `{data, revision}` |
| POST | `/campaigns/batch` | same shape as decks/batch |
| POST | `/campaigns` | same shape as decks POST |
| PUT | `/campaigns/:id` | same |
| DELETE | `/campaigns/:id` | same |
| GET | `/folders` | `{state, revision}` or 404 if never saved |
| PUT | `/folders` | body `{state, expectedRevision}` (`expectedRevision: null` = first write) → `{revision}`; 409 → `{state, revision}` |
| GET | `/settings` | like folders, `settings` field instead of `state` |
| PUT | `/settings` | like folders |
| GET | `/achievements` | like folders |
| PUT | `/achievements` | like folders |

All sync routes require `sessionAuth()` (with completed profile).

### 3.3 Sync protocol (precise semantics)

Server-side rules, enforced in every deck/campaign/blob write:

- Every row carries a `revision` (UUID). Every successful write generates a **new**
  revision and bumps `updated_at`.
- Writes carry `expectedRevision`. The UPDATE runs conditionally
  (`WHERE id = ? AND account_id = ? AND revision = ?` — the SQLite equivalent of
  arkham's `ON CONFLICT ... DO UPDATE ... WHERE revision = ?` pattern in
  `backend/src/lib/revisioned-account-state.ts`). Zero rows updated + row exists ⇒
  respond **409 with the current server copy** so the client can resolve.
- All reads/writes are scoped by `account_id` from the session. Cross-account access
  must be impossible (tests assert this).
- Deck/campaign `data` is validated with `DeckSchema` / `CampaignSchema` from
  `@earthborne-build/shared` before storage. Size caps: 2 MB per item, 64 KB for blobs.

Client-side reconciliation, run on login and on demand (`syncAll`):

1. Fetch `/sync/manifest`.
2. Let `L` = local items (`data.decks` / `data.campaigns`), `S` = per-item sync state
   (`sync.decks.items` / `sync.campaigns.items`, persisted), `R` = manifest.
3. For each id in `R` but not in `L`: **download** via batch → insert locally, set
   `S[id] = {revision, status: "synced", lastSyncedAt: now}`.
4. For each id in `L` but not in `R`:
   - `S[id]` exists (item was synced before) ⇒ it was deleted on another device ⇒
     **delete locally**, drop `S[id]`.
   - `S[id]` missing (item never synced — e.g. created while logged out) ⇒ **upload**
     (POST), then set `S[id]`. (This is the mirror-everything policy.)
5. For each id in both:
   - `R.revision === S[id].revision` and local dirty
     (`item.date_update > S[id].lastSyncedAt`) ⇒ **push** (PUT with expectedRevision).
   - `R.revision === S[id].revision` and not dirty ⇒ nothing.
   - `R.revision !== S[id].revision` and not dirty ⇒ **download** (batch).
   - `R.revision !== S[id].revision` and dirty ⇒ **conflict**: set
     `S[id].conflict`, surface in UI; user picks "keep mine" (PUT with the server's
     current revision as expectedRevision) or "take theirs" (overwrite local).
6. Blobs (folders, settings, achievements): GET; same revision ⇒ push if dirty;
   different revision + not dirty ⇒ apply remote; different + dirty ⇒ conflict state
   (mirrors arkham's folders/settings conflict handling).
7. Ongoing mutations while logged in: after each local mutation of a synced entity, push
   immediately (decks: on save; campaigns/achievements/folders: debounced ~2 s since
   mutations are high-frequency). A failed push sets `status: "error"` and is retried on
   the next `syncAll` / next mutation.

ID policy: clients generate UUID ids locally and keep them on upload. The server accepts
the client id unless that id already exists (owned by anyone) — then it responds 409 and
the client re-keys locally (new UUID, rewrite references: `deckFolders`, `history`,
`undoHistory`, `deckEdits`, `campaign.deck_ids`) and retries once. During
complete-profile bulk upload the **server** re-keys colliding items and returns
`deckIdMap` / `campaignIdMap`; the server also rewrites `campaign.deck_ids` using
`deckIdMap` before storing campaigns.

### 3.4 Complete-profile (onboarding) contract

`POST /v2/account/auth/complete-profile`

```jsonc
// request
{
  "username": "sergiu",             // 3–64 chars, ^[a-zA-Z0-9_-]+$
  "uploads": {                      // optional; whole local state at signup time
    "decks": [ /* Deck[] */ ],
    "campaigns": [ /* Campaign[] */ ],
    "folders": { "folders": {}, "deckFolders": {} },
    "settings": { /* SettingsState */ },
    "achievements": { /* AchievementsState */ }
  }
}
// response
{
  "uploads": {
    "deckIdMap": { "<oldId>": "<newId>" },       // only re-keyed items appear
    "campaignIdMap": { "<oldId>": "<newId>" },
    "decks": [ { "data": {}, "revision": "..." } ],
    "campaigns": [ { "data": {}, "revision": "..." } ],
    "folders": { "state": {}, "revision": "..." },
    "settings": { "settings": {}, "revision": "..." },
    "achievements": { "state": {}, "revision": "..." }
  }
}
```

Everything runs in one DB transaction. On success the account's
`profile_completed_at` is set; until then, `sessionAuth()` (which defaults to
`requireCompleteProfile: true`) rejects with 403 and the frontend routes the user to the
complete-signup page. Reference: arkham `backend/src/features/auth/routes/oauth.ts`
(the `/complete-profile` handler and `applyCompleteProfileUploads`) and frontend
`frontend/src/pages/auth/complete-signup.tsx`, `store/slices/auth.ts`
(`applyCompleteProfileResponse`).

### 3.5 Cookies, CORS, and environments

- Session cookie: `httpOnly`, `SameSite=Strict`, `Secure` when `NODE_ENV=production`,
  `path=/`, maxAge = `SESSION_EXPIRY_HOURS`. Name from config (`eb_session` default).
  Sliding expiry: the auth middleware refreshes the cookie + DB expiry on every
  authenticated request (reference: arkham `session-auth-middleware.ts`).
- Frontend fetches to `/v2/account/*` must send `credentials: "include"`.
- CORS: split into `publicCorsMiddleware` (current behavior) and
  `authenticatedCorsMiddleware` (`credentials: true`, explicit origin echo — **never**
  `*` with credentials). Reference: arkham `backend/src/lib/cors.ts`.
- **Dev pitfall:** `SameSite=Strict` cookies flow only between same-site origins. Ports
  don't matter, hosts do. `localhost:3000 → localhost:8686` works;
  `localhost:3000 → 127.0.0.1:8686` does NOT. Task 6.6 updates `.env.example`
  accordingly. Sergiu's dev instance proxies the API same-origin over HTTPS, so it works
  there too.

### 3.6 New backend config keys

Extend `backend/src/lib/config.ts` (all new keys optional or defaulted so existing
deployments keep booting):

```
FRONTEND_URL          string, default "http://localhost:3000"   (email links)
SESSION_COOKIE_NAME   string, default "eb_session"
SESSION_EXPIRY_HOURS  coerced number, default 720               (30 days)
SMTP_HOST             string, optional — unset ⇒ ConsoleMailer (logs emails)
SMTP_PORT             coerced number, default 1025
SMTP_SECURE           coerced boolean, default false
SMTP_USER             string, default ""
SMTP_PASS             string, default ""
FROM_EMAIL            string, default "noreply@earthborne.build"
FROM_NAME             string, default "earthborne.build"
TURNSTILE_SECRET_KEY  string, optional — unset/empty ⇒ captcha disabled
```

Frontend env additions: `VITE_TURNSTILE_SITE_KEY` (optional).

---

## 4. Postgres → SQLite translation table

Apply these systematically when porting any backend query or DDL:

| arkham (Postgres) | earthborne (SQLite) |
|---|---|
| `uuid` column, `default uuidv7()` | `TEXT` column; generate `crypto.randomUUID()` in the query helper before insert |
| `jsonb` | `TEXT`; `JSON.stringify` on write, `JSON.parse` on read (see `backend/src/routes/sharing.ts` for the existing convention) |
| `timestamp ... default now()` | `TEXT`; pass `new Date().toISOString()` explicitly |
| `now()` comparisons in SQL | compare against an ISO string bound parameter (ISO-8601 sorts lexicographically) |
| Postgres enums (`create type ... as enum`) | `TEXT` + `CHECK (col IN (...))` |
| `varchar(n)` | `TEXT` (+ `CHECK(length(col) <= n)` only where arkham had an explicit check constraint) |
| partial unique index (`where col is not null`) | same syntax — SQLite supports partial indexes |
| expression index (`lower(name)`) | same syntax — SQLite supports expression indexes |
| `btree_gist` exclusion constraint | dropped (moderation is out of scope) |
| `on conflict (col) do update set ... where t.revision = ?` | same syntax — Kysely + SQLite support this; keep the pattern |
| `returningAll()` / `returning([...])` | supported by better-sqlite3 — keep |
| `octet_length()` | `length()` (byte-length nuance is acceptable) |

Also: confirm `PRAGMA foreign_keys = ON` is set in `backend/src/db/db.ts` (`getDatabase`).
If it is not, add it — the new tables rely on `ON DELETE CASCADE`. (Checked during
Task 1.2.)

Booleans: better-sqlite3 has no boolean type; store 0/1 if any boolean column appears
(none is planned — `verified_at`/`profile_completed_at` are nullable timestamps used as
flags, same trick as arkham).

---

## 5. Reference file map

"Port" = read the arkham file, recreate adapted. "New" = no arkham counterpart, design
by analogy. Earthborne backend keeps its **flat `routes/` layout** — do NOT introduce
arkham's `features/` folder structure.

### Backend

| arkham.build file | earthborne.build target | Mode |
|---|---|---|
| `backend/src/features/auth/lib/crypto.ts` | `backend/src/lib/auth/crypto.ts` | Port verbatim (pure Node) |
| `backend/src/lib/auth/sessions.ts` | `backend/src/lib/auth/sessions.ts` | Port (dialect: timestamps) |
| `backend/src/lib/auth/session-cookie.ts` | `backend/src/lib/auth/session-cookie.ts` | Port verbatim |
| `backend/src/lib/auth/session-auth-middleware.ts` | `backend/src/lib/auth/session-auth-middleware.ts` | Port (drop ban assertion) |
| `backend/src/lib/auth/accounts.ts` | `backend/src/lib/auth/accounts.ts` | Port (drop moderation join) |
| `backend/src/lib/auth/account-identities.ts` | `backend/src/lib/auth/account-identities.ts` | Port (drop oauth/provider_user_id paths) |
| `backend/src/features/auth/queries/accounts.ts` | `backend/src/db/queries/auth/accounts.ts` | Port |
| `backend/src/features/auth/queries/identities.ts` | `backend/src/db/queries/auth/identities.ts` | Port (email identity only) |
| `backend/src/features/auth/queries/verification-tokens.ts` | `backend/src/db/queries/auth/verification-tokens.ts` | Port |
| `backend/src/features/auth/lib/assertions.ts` | `backend/src/lib/auth/assertions.ts` | Port |
| `backend/src/features/auth/lib/turnstile.ts` | `backend/src/lib/auth/turnstile.ts` | Port |
| `backend/src/features/auth/lib/email-templates.ts` | `backend/src/lib/email/templates.ts` | Port + rebrand |
| `backend/src/features/auth/lib/verification-email.ts` | `backend/src/lib/auth/verification-email.ts` | Port (call mailer directly, no dispatcher) |
| `backend/src/lib/email/mailer.ts`, `base-template.ts` | `backend/src/lib/email/mailer.ts` | Port + add `ConsoleMailer` + `CaptureMailer` (tests) |
| `backend/src/features/auth/routes/email-auth.ts` | `backend/src/routes/auth.ts` (part) | Port |
| `backend/src/features/auth/routes/password-recovery.ts` | `backend/src/routes/auth.ts` (part) | Port |
| `backend/src/features/auth/routes/identity-management.ts` | `backend/src/routes/auth.ts` (part) | Port (drop `/oauth/:provider`) |
| `backend/src/features/auth/routes/oauth.ts` → only `/complete-profile` | `backend/src/routes/auth.ts` (part) | Port that one handler; extend uploads for campaigns/achievements |
| `backend/src/features/profile/routes.ts` | `backend/src/routes/profile.ts` | Port |
| `backend/src/features/decks/routes.ts` + `queries.ts` | `backend/src/routes/account-decks.ts` + `backend/src/db/queries/account-decks.ts` | Port, heavily simplified (JSON blob storage, no arkhamdb, no upgrade) |
| — | `backend/src/routes/account-campaigns.ts` + queries | New (clone of account-decks) |
| `backend/src/features/folders/routes.ts` | `backend/src/routes/account-blobs.ts` (folders part) | Port |
| `backend/src/features/settings/routes.ts` | `backend/src/routes/account-blobs.ts` (settings part) | Port |
| — | `backend/src/routes/account-blobs.ts` (achievements part) | New (clone of folders) |
| `backend/src/lib/revisioned-account-state.ts` | `backend/src/db/queries/revisioned-blobs.ts` | Port + extend to 3 tables |
| `backend/src/lib/cors.ts` | `backend/src/lib/cors.ts` | Port the split (public/authenticated) |
| `backend/src/tests/auth.spec.ts` (2839 lines) | `backend/src/tests/auth.spec.ts` | Port relevant subsets (skip all oauth/arkhamdb/moderation blocks) |

### Shared

| arkham.build file | earthborne.build target | Mode |
|---|---|---|
| `shared/src/dtos/auth.schema.ts` | `shared/src/dtos/auth.schema.ts` | Port; identity union reduced to email identity; extend complete-profile uploads with campaigns + achievements |
| `shared/src/dtos/deck-sync.schema.ts` | `shared/src/dtos/sync.schema.ts` | Port + rework: single provider (drop provider fields), revision terminology, add campaign schemas, add blob (folders/settings/achievements) request/response schemas |
| `shared/src/dtos/folder-sync.schema.ts` | folded into `sync.schema.ts` | Port |
| `shared/src/dtos/settings.schema.ts` | folded into `sync.schema.ts` | Port (settings as opaque validated object; see Task 2.1) |
| `shared/src/dtos/profile.schema.ts` | `shared/src/dtos/profile.schema.ts` | Port |

### Frontend

| arkham.build file | earthborne.build target | Mode |
|---|---|---|
| `frontend/src/store/services/http-client.ts` (+ `.context.ts`) | same paths | Port |
| `frontend/src/store/services/requests/shared.ts` (`requestApi`) | merge into existing `requests/shared.ts` | Port (adds `credentials: "include"`, JSON helpers) |
| `frontend/src/store/services/requests/auth.ts` | same path | Port |
| `frontend/src/store/services/requests/decks.ts` | same path | Port simplified |
| — | `requests/campaigns.ts` | New (clone of decks) |
| `frontend/src/store/services/requests/folders.ts`, `settings.ts` | same paths + `achievements.ts` | Port + clone |
| `frontend/src/store/services/requests/profile.ts` | same path | Port |
| `frontend/src/store/slices/auth.ts` + `.types.ts` + `auth.spec.ts` | same paths | Port |
| `frontend/src/store/slices/sync.ts` + `.types.ts` + `sync.spec.ts` | same paths | Port + extend (campaigns, achievements) |
| `frontend/src/store/lib/sync.ts` | same path | Port (helpers: updateDeckSyncSuccess etc.) |
| `frontend/src/store/lib/sync-reconciliation.ts` + spec | same path | Port + extend for campaigns; strip arkhamdb branches |
| `frontend/src/store/lib/settings-sync.ts` + spec | same path | Port (defines which settings keys sync; mirror arkham's carve-outs) |
| `frontend/src/store/lib/deck-crud.ts` | **do not copy wholesale** — used as the pattern reference for rewiring earthborne's existing deck mutations (Phase 8) | Reference only |
| `frontend/src/store/selectors/auth.ts`, `sync.ts` | same paths | Port |
| `frontend/src/pages/auth/*` (all files) | same paths | Port + rebrand + i18n |
| `frontend/src/utils/inject-script.ts` | same path | Port (Turnstile loader) |
| `frontend/src/components/user-account/avatar.tsx` + css | same path | Port |
| `frontend/src/components/ui/status-pill.tsx`, `status-bubble.tsx` (+css) | same paths | Port |
| `frontend/src/store/persist/migrations/0008-add-auth.ts` | new migration, next free number in `frontend/src/store/persist/migrations/` | Port pattern |
| `frontend/src/components/masthead.tsx` | existing earthborne masthead | Adapt (add account menu) — earthborne's has diverged; merge manually |
| `frontend/src/app.tsx`, `main.tsx` | existing earthborne files | Adapt (routes, session init, http-client context) |

---

## 6. Phases

Legend: each task has an id, steps, and completion criteria. Checkpoints list commands
that must all succeed plus any manual confirmation required.

---

### Phase 0 — Groundwork

Goal: dependencies, config, mailer, and small utilities in place; nothing user-visible.

- [x] **Task 0.1 — Read the codebase.** Read (do not modify): this plan fully;
  `docs/architecture.md`; `docs/api.md`; `backend/src/app.ts`; `backend/src/lib/config.ts`;
  `backend/src/db/db.ts`; `backend/src/tests/test-utils.ts`; `backend/src/routes/sharing.ts`;
  `shared/src/schemas/deck.schema.ts`; `shared/src/schemas/campaign.schema.ts`;
  `frontend/src/store/slices/index.ts`; `frontend/src/store/persist/index.ts`;
  `frontend/src/store/slices/data.types.ts`. In arkham.build: `backend/src/app.ts`;
  `backend/src/db/migrations/20260113192307_add_users.sql`;
  `shared/src/dtos/auth.schema.ts`; `frontend/src/store/slices/auth.ts`;
  `frontend/src/store/slices/sync.ts`.
  *Done when:* you can state (to Sergiu, in one short message) the three main design
  deviations from arkham (JSON-blob item storage; single provider + revision-uuid
  concurrency; mirror-everything policy) and the earthborne conventions (flat routes,
  ISO timestamps, JSON-as-TEXT).

- [x] **Task 0.2 — Add dependencies.** In `backend/`: `npm install nodemailer` and
  `npm install -D @types/nodemailer` (run installs from the repo root with `-w backend`).
  No other new runtime deps are expected in this phase.
  *Done when:* `npm run check -w backend` passes and `package-lock.json` diff contains
  only nodemailer-related additions.

- [x] **Task 0.3 — Extend backend config.** Add the keys from §3.6 to
  `backend/src/lib/config.ts` with the listed defaults/optionality. Update
  `backend/.env.example` with a commented SMTP/mailcrab section, `FRONTEND_URL`,
  session settings, and `TURNSTILE_SECRET_KEY`.
  *Done when:* config parses with **no** new env vars set (defaults kick in);
  `npm run test -w backend` still passes.

- [x] **Task 0.4 — Mailer.** Create `backend/src/lib/email/mailer.ts` with the `Mailer`
  interface and three implementations: `SMTPMailer` (port from arkham
  `backend/src/lib/email/mailer.ts`), `ConsoleMailer` (logs to/subject/body via the
  backend logger — used when `SMTP_HOST` is unset), `CaptureMailer` (stores sent mails
  in a public array — for tests). Add a `mailerFromConfig(config): Mailer` factory.
  Wire it: `appFactory(config, database, mailer?)` — third param optional, defaulting to
  `mailerFromConfig(config)`; expose via Hono context (`c.set("mailer", ...)` — extend
  `backend/src/lib/hono-env.ts`). Update `backend/src/main.ts` accordingly.
  *Done when:* backend typecheck + tests pass; `hono-env.ts` exposes `mailer`.

- [x] **Task 0.5 — Foreign keys pragma.** Check `backend/src/db/db.ts` for
  `PRAGMA foreign_keys`. If absent, enable it in `getDatabase` (better-sqlite3:
  `db.pragma("foreign_keys = ON")` or the Kysely dialect equivalent used in that file).
  Run the full backend test suite — if any existing test breaks due to FK enforcement,
  stop and report to Sergiu instead of weakening constraints.
  *Done when:* pragma is on; `npm run test -w backend` passes.

**Checkpoint 0:**
```bash
npm run check -w backend && npm run test -w backend && npm run lint
```
All green. Commit(s) pushed locally. Confirm with Sergiu before Phase 1.

---

### Phase 1 — Database migration + shared DTOs

Goal: schema exists; shared package speaks the new contracts.

- [x] **Task 1.1 — Migration.** Create
  `backend/src/db/migrations/<today's date per existing naming>_add_accounts.sql` (follow
  the `YYYYMMDDHHMMSS_name.sql` dbmate convention used by existing files, with
  `-- migrate:up` / `-- migrate:down` sections). Contents — exactly these tables
  (adapted from arkham's `20260113192307_add_users.sql` via §4; moderation, oauth_token,
  and arkhamdb tables are intentionally absent):

  ```sql
  -- migrate:up

  CREATE TABLE account (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(name) <= 64),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    profile_completed_at TEXT,
    last_activity_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX idx_account_name_lower ON account (lower(name));
  CREATE INDEX idx_account_last_activity_at ON account (last_activity_at);

  CREATE TABLE account_identity (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    email TEXT CHECK (email IS NULL OR length(email) <= 255),
    password_hash TEXT,
    pending_email TEXT CHECK (pending_email IS NULL OR length(pending_email) <= 255),
    verified_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX idx_account_identity_account_id ON account_identity (account_id);
  CREATE UNIQUE INDEX idx_account_identity_provider_email
    ON account_identity (provider, email) WHERE email IS NOT NULL;
  CREATE UNIQUE INDEX idx_account_identity_provider_pending_email
    ON account_identity (provider, pending_email) WHERE pending_email IS NOT NULL;

  CREATE TABLE session (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    last_activity_at TEXT NOT NULL
  );
  CREATE INDEX idx_session_account_id ON session (account_id);
  CREATE INDEX idx_session_expires_at ON session (expires_at);

  CREATE TABLE verification_token (
    id TEXT PRIMARY KEY,
    account_identity_id TEXT REFERENCES account_identity(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    token_type TEXT NOT NULL CHECK (token_type IN ('email_verification', 'password_reset')),
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    UNIQUE (token_type, token_hash)
  );
  CREATE INDEX idx_verification_token_email ON verification_token (email);
  CREATE INDEX idx_verification_token_expires_at ON verification_token (expires_at);

  CREATE TABLE account_deck (
    id TEXT PRIMARY KEY CHECK (length(id) <= 64),
    account_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    revision TEXT NOT NULL,
    data TEXT NOT NULL CHECK (length(data) <= 2097152),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX idx_account_deck_account_id ON account_deck (account_id);

  CREATE TABLE account_campaign (
    id TEXT PRIMARY KEY CHECK (length(id) <= 64),
    account_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    revision TEXT NOT NULL,
    data TEXT NOT NULL CHECK (length(data) <= 2097152),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX idx_account_campaign_account_id ON account_campaign (account_id);

  CREATE TABLE account_folder (
    account_id TEXT PRIMARY KEY REFERENCES account(id) ON DELETE CASCADE,
    revision TEXT NOT NULL,
    state TEXT NOT NULL CHECK (length(state) <= 65536)
  );

  CREATE TABLE account_settings (
    account_id TEXT PRIMARY KEY REFERENCES account(id) ON DELETE CASCADE,
    revision TEXT NOT NULL,
    settings TEXT NOT NULL CHECK (length(settings) <= 65536)
  );

  CREATE TABLE account_achievements (
    account_id TEXT PRIMARY KEY REFERENCES account(id) ON DELETE CASCADE,
    revision TEXT NOT NULL,
    state TEXT NOT NULL CHECK (length(state) <= 65536)
  );

  ALTER TABLE shared_deck ADD COLUMN account_id TEXT REFERENCES account(id) ON DELETE SET NULL;
  CREATE INDEX idx_shared_deck_account_id ON shared_deck (account_id);

  -- migrate:down
  DROP INDEX IF EXISTS idx_shared_deck_account_id;
  ALTER TABLE shared_deck DROP COLUMN account_id;
  DROP TABLE IF EXISTS account_achievements;
  DROP TABLE IF EXISTS account_settings;
  DROP TABLE IF EXISTS account_folder;
  DROP TABLE IF EXISTS account_campaign;
  DROP TABLE IF EXISTS account_deck;
  DROP TABLE IF EXISTS verification_token;
  DROP TABLE IF EXISTS session;
  DROP TABLE IF EXISTS account_identity;
  DROP TABLE IF EXISTS account;
  ```

  Regenerate the schema dump the same way existing migrations do (check how
  `backend/src/db/schema.sql` is produced — dbmate does it on `db:migrate`; ask Sergiu
  to run the dbmate command if it needs a real DB file, or run it against a scratch
  `DATABASE_URL=sqlite:/tmp/eb-migrate-test.db`).
  *Done when:* migration applies cleanly to a scratch DB, `migrate:down` reverts it, and
  the backend test harness (which applies all migrations to `:memory:`) still passes.

- [x] **Task 1.2 — Kysely schema types.** Extend `backend/src/db/schema.types.ts` with
  interfaces for all new tables + the `shared_deck.account_id` column, following the
  file's existing style. Reference: arkham `backend/src/db/schema.types.ts` (adapt types:
  uuid→string, timestamps→string, jsonb→string).
  *Done when:* `npm run check -w backend` passes.

- [x] **Task 1.3 — Shared DTOs: auth.** Create `shared/src/dtos/auth.schema.ts` ported
  from arkham's file. Keep: `SignupRequestSchema`, `LoginRequestSchema`,
  `CreateEmailIdentityRequestSchema` (only if used — check; drop if orphaned),
  `UpdateCredentialsRequestSchema`, `ForgotPasswordRequestSchema`,
  `ResetPasswordRequestSchema`, `VerifyEmailRequestSchema`,
  `ResendVerificationRequestSchema`, `SessionResponseSchema`,
  `CompleteProfileRequestSchema` / `ResponseSchema`, `PATTERN_VALID_USERNAME`,
  `PATTERN_VALID_PASSWORD`, `PASSWORD_MAX_LENGTH`, `CanonicalEmailSchema`. Changes:
  identity union reduced to `EmailIdentitySchema` only (`identities: z.array(...)` stays,
  future-proofing); `CompleteProfileRequestSchema.uploads` gains
  `campaigns: z.array(CampaignSchema).optional()` and
  `achievements: <blob schema>.optional()`; response gains `campaignIdMap`, `campaigns`,
  `achievements`. Import `DeckSchema`/`CampaignSchema` from `../schemas/`.
- [x] **Task 1.4 — Shared DTOs: sync.** Create `shared/src/dtos/sync.schema.ts`
  (reference: arkham `deck-sync.schema.ts` + `folder-sync.schema.ts` +
  `settings.schema.ts`). Define: `ManifestItemSchema {id, revision, updatedAt}`;
  `SyncManifestResponseSchema {decks, campaigns}`; `ItemBatchRequestSchema {ids}` with
  `SYNC_BATCH_LIMIT = 250`; `SyncedItemSchema<T>` pattern → concrete
  `SyncedDeckSchema {data: DeckSchema, revision, updatedAt}` and `SyncedCampaignSchema`;
  `ItemWriteRequest` (`{data, expectedRevision}`) and delete request
  (`{expectedRevision}`); conflict response (`{data, revision}`); blob schemas:
  `FolderStateSchema` (`{folders: z.record(...), deckFolders: z.record(...)}` — model the
  frontend `Folder` type from `frontend/src/store/slices/data.types.ts` as a zod object),
  `BlobResponseSchema {state, revision}` and `{settings, revision}` variant, blob write
  request `{state|settings, expectedRevision: z.string().nullable()}`. Settings blob:
  validate as `z.record(z.string(), z.unknown())` with size enforced server-side — the
  full SettingsState shape is a frontend type and should not be duplicated into zod.
- [x] **Task 1.5 — Shared DTOs: profile + exports.** Port
  `shared/src/dtos/profile.schema.ts` (rename-account request). Export everything new
  from `shared/src/index.ts` following its existing export style. Run shared tests.
  *Done when (1.3–1.5):* `npm run check -w backend`, `npm run check -w frontend`,
  `npm run test -w shared` all pass; no orphaned exports (biome will flag unused).

**Checkpoint 1:**
```bash
npm run test -w shared && npm run check -w backend && npm run test -w backend && npm run check -w frontend && npm run lint
```
Plus: show Sergiu the migration file diff for approval before committing it.

---

### Phase 2 — Backend auth core (libraries, no routes yet)

Goal: all auth building blocks exist with unit coverage.

- [x] **Task 2.1 — Crypto.** Create `backend/src/lib/auth/crypto.ts` — copy arkham's
  `features/auth/lib/crypto.ts` verbatim (scrypt hash/verify, `generateRandomToken`,
  `hashToken`). No changes needed.
- [x] **Task 2.2 — Account + identity queries.** Create
  `backend/src/db/queries/auth/accounts.ts` and `identities.ts` (references per §5 map).
  Functions to port: `createAccount` (creates account + email identity in one tx —
  signature: `{name, email, passwordHash, profileCompletedAt}`), `accountNameExists`
  (case-insensitive, excludes own id), `completeAccountProfile`, `updateAccountActivity`,
  `findAccountForAuth` (no moderation join — just select the account),
  `getAccountIdentity`, `getAccountIdentityByEmail`,
  `getAccountIdentityByEmailOrPendingEmail`, `updateAccountIdentityVerified`,
  `activatePendingAccountIdentityEmail`, `setPendingEmail`, `updatePasswordHash`,
  `renameAccount`, `deleteAccount`. Generate ids/timestamps in code (§4). Skip every
  function touching `provider_user_id`, `state`, or oauth.
- [x] **Task 2.3 — Verification tokens.** Create
  `backend/src/db/queries/auth/verification-tokens.ts`: `createVerificationToken`,
  `consumeVerificationToken` (delete-and-return; must be atomic — do it inside the
  caller's transaction), `getLatestVerificationToken` (for cooldown),
  `cleanupExpiredTokens`. Token TTLs: mirror arkham's constants (find them in the
  reference; typically 24 h verification, 1 h reset — confirm from code, do not guess).
- [x] **Task 2.4 — Sessions.** Create `backend/src/lib/auth/sessions.ts` (port; §4
  dialect changes; `id` generated in code) and `session-cookie.ts` (port; cookie name +
  expiry from earthborne config keys).
- [x] **Task 2.5 — Session middleware.** Create
  `backend/src/lib/auth/session-auth-middleware.ts` — port arkham's, minus
  `assertAccountNotBanned`. Extend `backend/src/lib/hono-env.ts` with the
  `session`/`account`/`skipSessionCookieRefresh` context variables (mirror arkham's
  `SessionAuthHonoEnv` pattern).
- [x] **Task 2.6 — Assertions + turnstile.** Create `backend/src/lib/auth/assertions.ts`
  (`assertEmailAvailable`, `assertVerificationTokenCooldown`) and
  `backend/src/lib/auth/turnstile.ts` (port; no-op when `TURNSTILE_SECRET_KEY` unset).
- [x] **Task 2.7 — Email templates + sender.** Create `backend/src/lib/email/templates.ts`
  (port arkham's `email-templates.ts` + `base-template.ts`; rebrand every string to
  earthborne.build; links built from `config.FRONTEND_URL` —
  verification: `${FRONTEND_URL}/auth/verify-email?token=...`,
  reset: `${FRONTEND_URL}/auth/reset-password?token=...`) and
  `backend/src/lib/auth/verification-email.ts` (port `sendVerificationEmail`; replace
  `dispatcher.enqueueEmail(...)` with a direct `mailer.send(...)` — **send after the DB
  transaction commits**, not inside it: structure the route so the token is created in
  the tx and the email is sent after `execute()` resolves).
- [x] **Task 2.8 — Unit tests for the core.** Create
  `backend/src/tests/auth-lib.spec.ts` using the existing `test-utils.ts` harness:
  password hash/verify round-trip + tamper rejection; session create → get → expiry →
  delete; verification token create → consume-once (second consume fails) → expiry;
  `assertEmailAvailable` uniqueness incl. pending_email collisions; account name
  case-insensitive uniqueness (insert `Foo`, expect `foo` to violate
  `idx_account_name_lower`).

**Checkpoint 2:**
```bash
npm run check -w backend && npm run test -w backend && npm run lint
```

---

### Phase 3 — Backend auth routes

Goal: full signup → verify → login → session → credentials-management → delete-account
lifecycle over HTTP, tested.

- [x] **Task 3.1 — Route file skeleton.** Create `backend/src/routes/auth.ts` exporting
  one Hono router. Port handlers in this order, each compiling before the next:
  1. `POST /signup` (turnstile → email availability → scrypt → tx: createAccount with
     `name: "email_" + crypto.randomUUID()` and `profileCompletedAt: null` → create
     verification token; send mail after commit) — reference `email-auth.ts`.
  2. `POST /login`, `POST /logout` — reference `email-auth.ts` (no ban assertion).
  3. `POST /verify-email`, `POST /resend-verification` — reference `email-auth.ts`,
     including the pending-email activation branch.
  4. `POST /forgot-password`, `POST /reset-password` — reference
     `password-recovery.ts`. Notes: forgot-password accepts email **or username**
     (resolve username → account → email identity); always 200; reset-password deletes
     all account sessions after updating the hash.
  5. `GET /me` — reference `identity-management.ts:53`. Response =
     `SessionResponseSchema`: account id/name/profileComplete + identities array with
     the single email identity (email, pendingEmail, verified).
  6. `PATCH /credentials` (requires current password; newEmail → set `pending_email` +
     send verification to it; newPassword → update hash + delete other sessions),
     `DELETE /credentials/pending-email` — reference `identity-management.ts`.
  7. `DELETE /` (delete account; FK cascades remove everything; clear cookie) —
     reference `identity-management.ts:36`.
- [x] **Task 3.2 — Complete-profile.** In the same router: `POST /complete-profile`
  per §3.4. Reference: arkham `features/auth/routes/oauth.ts` (`/complete-profile`
  handler + `applyCompleteProfileUploads`). Adaptations: uploads also carry `campaigns`
  and `achievements`; deck/campaign rows are JSON blobs (Task 4.1's insert helpers —
  if Phase 4 isn't done yet, implement minimal insert helpers now in
  `backend/src/db/queries/account-decks.ts` / `account-campaigns.ts` and let Phase 4
  extend those files); server re-keys colliding ids and returns
  `deckIdMap`/`campaignIdMap`; rewrite `campaign.deck_ids` and `folders.deckFolders`
  keys through `deckIdMap` before storing; whole thing in one transaction; sets
  `profile_completed_at`; validates username against `accountNameExists`.
- [x] **Task 3.3 — Profile routes.** Create `backend/src/routes/profile.ts`:
  `PATCH /` renames the account (unique check, updates `updated_at`). Reference:
  arkham `features/profile/routes.ts`.
- [x] **Task 3.4 — CORS split.** Rework `backend/src/lib/cors.ts` into
  `publicCorsMiddleware` (current behavior) + `authenticatedCorsMiddleware`
  (`credentials: true`, origin matcher echoing exact origins from `CORS_ORIGINS`).
  Reference: arkham `backend/src/lib/cors.ts`.
- [x] **Task 3.5 — App wiring.** In `backend/src/app.ts`: keep existing `pub` router on
  public CORS; add an `account` sub-router with authenticated CORS mounted at
  `/v2/account`, routing `/auth` → auth router and `/profile` → profile router. Do not
  reorder existing routes.
- [x] **Task 3.6 — Route tests.** Create `backend/src/tests/auth.spec.ts` (port relevant
  arkham blocks; use `app.request(...)` like existing earthborne tests, `CaptureMailer`
  injected via `appFactory`). Minimum scenarios — each is a test:
  - signup 201 → mail captured → extract token from mail body → verify-email 200 →
    login 200 sets cookie → `GET /me` 200 with `profileComplete: false`.
  - login before verification → 403; wrong password → 401; unknown email → 401
    (same message — no enumeration).
  - duplicate signup for same email → 4xx from `assertEmailAvailable`.
  - resend-verification: 200 for unknown email (no mail sent); cooldown returns 4xx on
    immediate second request.
  - complete-profile: taken username → 400; success sets `profileComplete: true`;
    uploads round-trip (send 2 decks + 1 campaign referencing them + folders + settings
    + achievements → response revisions present → verify DB rows; force an id collision
    by pre-inserting a deck with the same id under another account → expect
    `deckIdMap` entry and rewritten `campaign.deck_ids`).
  - sessionAuth: no cookie → 401; garbage cookie → 401; expired session (insert row
    with past `expires_at`) → 401; incomplete profile hitting a
    `requireCompleteProfile` route → 403.
  - forgot/reset: full flow with token from captured mail; old password stops working;
    all sessions invalidated; token single-use.
  - credentials: change password (current-password wrong → 4xx); change email creates
    `pending_email` + verification mail; verify-email activates it; login with new
    email works, old email freed.
  - delete account → subsequent `/me` 401 → all rows for the account gone (query each
    table directly).
  - cross-account isolation smoke: user B cannot see any effect of user A's data.

**Checkpoint 3:**
```bash
npm run check -w backend && npm run test -w backend && npm run lint
```
All auth scenarios above green. Walk Sergiu through the test list for sign-off.

---

### Phase 4 — Backend sync APIs

Goal: decks, campaigns, folders, settings, achievements CRUD with revision-based
optimistic concurrency, tested.

- [x] **Task 4.1 — Deck + campaign queries.** Create
  `backend/src/db/queries/account-decks.ts` and `account-campaigns.ts` (identical shape;
  consider one generic module parameterized by table name — mirror how arkham's
  `revisioned-account-state.ts` handles two tables with overloads). Functions:
  `listManifest(db, accountId)` → `{id, revision, updated_at}[]`;
  `getBatch(db, accountId, ids)`; `insertItem(db, accountId, id, data)` → row (generates
  revision + timestamps; caller handles pk-conflict error → 409 or re-key);
  `updateItem(db, accountId, id, data, expectedRevision)` → updated row or undefined
  (conditional UPDATE per §3.3); `deleteItem(db, accountId, id, expectedRevision)` →
  boolean; `getItem(db, accountId, id)`. Use earthborne's existing
  `isUniqueViolation`-style error detection if present (check `backend/src/lib/` /
  `db.helpers.ts`; better-sqlite3 throws `SQLITE_CONSTRAINT_PRIMARYKEY` — write a small
  helper if none exists).
- [x] **Task 4.2 — Blob queries.** Create `backend/src/db/queries/revisioned-blobs.ts`
  porting arkham's `revisioned-account-state.ts`, extended to the three tables
  (`account_folder.state`, `account_settings.settings`, `account_achievements.state`).
  Keep the exact concurrency semantics: `expectedRevision == null` ⇒
  `ON CONFLICT DO NOTHING` insert (returns undefined if a row already existed ⇒ 409);
  else conditional `DO UPDATE ... WHERE revision = expected` (returns undefined on
  mismatch ⇒ 409).
- [x] **Task 4.3 — Routes.** Create `backend/src/routes/account-decks.ts`,
  `account-campaigns.ts`, `account-blobs.ts` implementing the §3.2 table (reference:
  arkham `features/decks/routes.ts`, `folders/routes.ts`, `settings/routes.ts`).
  Every handler: `sessionAuth()` + zod validation from `sync.schema.ts` + JSON parse of
  stored `data` on the way out. The combined manifest route (`GET /sync/manifest`) can
  live in `account-decks.ts` or its own tiny router — mount so the final paths match
  §3.2. Wire all into the `/v2/account` group in `app.ts`.
- [x] **Task 4.4 — Sync tests.** Create `backend/src/tests/account-sync.spec.ts`. Helper:
  `signupAndLogin(app)` → cookie (reuse Phase 3 flows; factor shared test helpers into
  `backend/src/tests/auth-helpers.ts`). Scenarios:
  - manifest empty → POST deck → manifest has 1 entry with revision; batch returns the
    deck byte-identical (deep-equal after JSON round-trip).
  - PUT with correct expectedRevision → new revision ≠ old; PUT with stale revision →
    409 + body carries current `{data, revision}`.
  - DELETE with stale revision → 409; with correct → gone from manifest; second
    DELETE → 404.
  - POST with an id owned by another account → 409 (and the other account's deck is
    untouched).
  - invalid Deck payload (strip a required field) → 400.
  - batch: >250 ids → 400; ids not owned by caller are silently absent from response.
  - campaigns: repeat the core cases (POST/PUT-conflict/DELETE) against
    `/v2/account/campaigns`.
  - blobs (run for folders + settings + achievements): first PUT with
    `expectedRevision: null` → revision; GET returns it; PUT with stale revision →
    409 + current; PUT with `expectedRevision: null` when a row exists → 409.
  - authorization: every route 401 without cookie; account A's items invisible to B
    (manifest, batch, GET, PUT, DELETE all checked).
  - oversized payload (data > 2 MB / blob > 64 KB) → 4xx (CHECK constraint or explicit
    validation — either is fine, but the response must not be a 500).

**Checkpoint 4:**
```bash
npm run check -w backend && npm run test -w backend && npm run lint
```
This completes the backend except sharing. Get Sergiu's sign-off.

---

### Phase 5 — Backend sharing/account integration

Goal: shares created by logged-in users are account-owned; guides can show authors.

- [x] **Task 5.1 — Optional session middleware.** Add `optionalSessionAuth()` to
  `session-auth-middleware.ts`: if a valid session cookie is present, populate
  `account`/`session` in context; otherwise continue without error (no 401). Do not
  refresh cookies here for anonymous requests.
- [x] **Task 5.2 — Sharing routes.** In `backend/src/routes/sharing.ts`: apply
  `optionalSessionAuth()` to POST/PUT/DELETE. On POST: set `shared_deck.account_id` when
  an account is present (still record `client_id` as today). On PUT/DELETE: allow if the
  caller matches `client_id` **or** owns the share via `account_id` — so a logged-in
  user can manage their shares from any device. Update
  `backend/src/db/queries/sharing.ts` accordingly. Anonymous behavior must remain
  byte-compatible (existing tests keep passing untouched).
- [x] **Task 5.3 — Author in decklist search.** In
  `backend/src/db/queries/decklists.ts` (+ `shared/src/dtos/decklist-*.schema.ts`
  response schema): LEFT JOIN `account` on `shared_deck.account_id`, expose
  `author_name: string | null`. Only accounts with completed profiles have meaningful
  names — join condition or a `WHERE profile_completed_at IS NOT NULL` guard on the
  joined name (null it out otherwise, since placeholder names look like `email_<uuid>`).
- [x] **Task 5.4 — Tests.** Extend the sharing/decklists specs: anonymous share has null
  author; authed share carries account_id; authed user can PUT/DELETE own share with a
  different client id; other users cannot; search response includes `author_name`.

**Checkpoint 5:**
```bash
npm run check -w backend && npm run test -w backend && npm run test -w shared && npm run lint
```
**The entire backend is now done.** Sergiu may deploy it to the dev instance — frontend
work depends only on the shared package from here.

---

### Phase 6 — Frontend foundations

Goal: the store knows about auth; the app boots a session; nothing visible yet beyond
that.

- [x] **Task 6.1 — HTTP client.** Port `frontend/src/store/services/http-client.ts` and
  `http-client.context.ts`. Port arkham's `requestApi` from its `requests/shared.ts`
  into earthborne's existing `requests/shared.ts` (keep earthborne's `ApiError` and
  `apiV2Request` untouched for existing callers): the new `requestApi(apiUrl, path,
  options)` must set `credentials: "include"` and default `Content-Type: application/json`
  when a body is present. The client is created once at boot and provided via the
  context module — Task 6.6 specifies the exact wiring in `main.tsx`.
- [x] **Task 6.2 — Request modules.** Create
  `frontend/src/store/services/requests/{auth,decks,campaigns,folders,settings,achievements,profile}.ts`
  typed against `@earthborne-build/shared` DTOs, implementing exactly the §3.2 surface.
  Reference arkham's `requests/` for shape (fetchSession, postLogin, postLogout,
  postSignup, postVerifyEmail, postResendVerification, postForgotPassword,
  postResetPassword, patchCredentials, deletePendingEmail, deleteAccount,
  postCompleteProfile; fetchSyncManifest, fetchDeckBatch, postDeck, putDeck, deleteDeck
  (+ campaign clones); fetchFolders/putFolders (+ settings/achievements variants) with
  the `is...ConflictError` helpers keyed on status 409).
- [x] **Task 6.3 — Auth slice.** Port `slices/auth.ts`, `auth.types.ts`, `auth.spec.ts`,
  `selectors/auth.ts`. Adaptations: `applyCompleteProfileResponse` additionally handles
  `campaignIdMap` + `campaigns` (rewrite `data.campaigns` keys, set campaign sync items)
  and `achievements` (apply revision to sync state); earthborne has no
  `rebuildDeckHistory` — its `data.history` entries are plain `[]` per deck, so when
  remapping ids just move the `history`/`undoHistory`/`deckEdits`/`deckFolders` entries
  to the new keys. Register the slice in `frontend/src/store/slices/index.ts` (both the
  `StoreState` type union and `createStore` composition — copy the existing pattern).
- [x] **Task 6.4 — Sync slice skeleton.** Port `slices/sync.types.ts` + the state/setter
  half of `slices/sync.ts` (initial states, `setSettingsSync`, `setDecksSync`,
  `setFoldersSync`, `setDeckSyncItem`, `clearAccountState`) extended with `campaigns`
  (per-item, mirroring decks) and `achievements` (blob, mirroring folders/settings).
  `clearAccountState` implements the logout data-clearing of §2.3: remove all synced
  decks/campaigns from `data`, reset folders/settings/achievements sync state, reset
  `sync` + `auth` to initial. The reconciliation half (`bootstrapAuthenticatedState`,
  `syncDecks`, conflict resolution) is Phase 8 — stub `bootstrapAuthenticatedState` as
  a no-op with a `// implemented in phase 8` comment so `initSession` compiles.
- [x] **Task 6.5 — Persistence.** Add `auth` (session snapshot: `{session, status}`) and
  `sync` to the `appStorage` partialize in `frontend/src/store/persist/index.ts` and the
  `AppState` pick-type. Add a persist migration (next free number in
  `persist/migrations/`, registered wherever `migrate.ts` registers them) that seeds
  `auth`/`sync` initial states for existing users — reference arkham's `0008-add-auth.ts`.
  Bump `VERSION` in `persist/storage.ts` per the existing migration convention.
- [x] **Task 6.6 — Boot wiring + env.** Exact insertion points (verified 2026-07-07 —
  re-read the files first; if they've drifted, adapt but keep the same hook positions):
  - `frontend/src/store/slices/ui.types.ts`: add `sessionInitialized: boolean` to
    `UIState["ui"]` (next to the existing `initialized` flag) and add it to the initial
    state in `frontend/src/store/slices/ui.ts` (initial value `false`).
  - `frontend/src/main.tsx`: the boot sequence is the `init()` function at the bottom
    (currently calls `useStore.getState().init(queryMetadata, queryDataVersion,
    queryCards, { refresh: false })`). After that `await` resolves, create the http
    client (`createHttpClient({ apiUrl: import.meta.env.VITE_API_URL, onUnauthorized:
    () => useStore.getState().handleUnauthorized() })`), register it in
    `http-client.context.ts`, then `await useStore.getState().initSession(client)`.
    Do NOT block the store `init` on the session — data load and session init are
    sequential here only because the store must exist first; a session failure must
    not break app boot (initSession already swallows non-401 errors — verify the port
    kept that).
  - Note: the store's `init` in `frontend/src/store/slices/app.ts` calls `hydrate()`
    internally and sets `ui.initialized` — do not touch it; `sessionInitialized` is
    set exclusively by the auth slice (`initSession`/`login`/`logout` paths, as in the
    arkham reference).
  - `frontend/.env.example`: change `VITE_API_URL` and `VITE_API_LEGACY_URL` from
    `127.0.0.1` to `localhost` with a comment explaining the SameSite constraint
    (§3.5); add `VITE_TURNSTILE_SITE_KEY=""`.
- [ ] **Task 6.7 — Frontend unit tests.** Adapt the ported `auth.spec.ts` (mock the http
  client, not fetch — arkham's spec shows the pattern with `get-mock-store`). Verify
  earthborne's `frontend/src/test/get-mock-store.ts` provides what the spec needs;
  extend it minimally if not.

**Checkpoint 6:**
```bash
npm run check -w frontend && npm run test -w frontend && npm run build -w frontend && npm run lint
```
App must still fully work logged-out (Sergiu smoke-checks his dev instance: browse,
create deck, edit campaign — zero behavioral change expected).

---

### Phase 7 — Frontend auth UI

Goal: a user can sign up, verify, log in, complete their profile, and log out in the
browser. (Data sync comes in Phase 8 — after login the app simply shows the account as
logged in; complete-profile already uploads local data since Phase 3's endpoint and
Phase 6's `applyCompleteProfileResponse` handle it.)

- [ ] **Task 7.1 — Auth pages.** Port from arkham `frontend/src/pages/auth/`:
  `auth-layout.tsx` (+css — swap the background asset for an existing earthborne visual
  or plain themed background; do NOT copy arkham's `login_bg.avif`), `auth-form.tsx`,
  `error-box.tsx`, `helpers.tsx`, `login.tsx`, `signup.tsx`, `forgot-password.tsx`,
  `reset-password.tsx`, `verify-email.tsx`, `complete-signup.tsx`, `oauth-separator`
  (**skip** — no oauth), `turnstile.tsx` + `frontend/src/utils/inject-script.ts` (port;
  render only when `VITE_TURNSTILE_SITE_KEY` is set). complete-signup adaptations: the
  "upload local data" step gathers decks + campaigns + folders + syncable settings +
  achievements from the store.
- [ ] **Task 7.2 — i18n.** Every UI string via `react-i18next` with keys in
  `frontend/src/locales/en.json`. Copy arkham's key subtrees (search its `en.json` for
  the keys used by the ported pages/components; arkham nests most under `auth.*`,
  `settings.account.*`, `deck_collection.sync*`) and adapt brand references. Note:
  earthborne now also has a German locale (`de.json`, added 2026-07) — do NOT add
  machine-translated German keys; add keys to `en.json` only and let German fall back
  to English (Sergiu handles translation separately).
- [ ] **Task 7.3 — Routes.** In `frontend/src/app.tsx` (structure verified 2026-07-07):
  - Add lazy imports next to the existing block of `lazy(() => import(...))` page
    declarations (top of file): one per auth page.
  - Add `<Route>` entries inside the `<Switch>` in `AppInner`, **before** the `*`
    fallback route: `/auth/login`, `/auth/signup`, `/auth/complete-signup`,
    `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`. (Order vs
    the other routes doesn't matter — none of the existing patterns match `/auth/...`
    two-segment paths — but keep them grouped together after `/debug` for readability.)
  - Redirects: add a `SessionRedirects` component rendered inside `<Router>` as a
    sibling of the existing `<RouteReset />` (same null-render pattern — see
    `RouteReset` in the same file). Logic (reference arkham `app.tsx`), using wouter's
    `useLocation` for navigation and reading `ui.sessionInitialized` + `auth` from the
    store; do nothing until `sessionInitialized` is true:
    - authenticated + profile incomplete + location not in
      {`/auth/complete-signup`, `/auth/verify-email`} ⇒ navigate to
      `/auth/complete-signup`.
    - authenticated + profile complete + location in {`/auth/login`, `/auth/signup`,
      `/auth/complete-signup`} ⇒ navigate to `/`.
- [ ] **Task 7.4 — Masthead account menu.** Earthborne's masthead is
  `frontend/src/components/masthead.tsx` (77 lines, verified 2026-07-07): a `header`
  with a `left` div (logo + children) and a `nav` with class `right` containing
  `{slotRight}`, then a `location !== "/settings"` block (LocaleQuickSwitch,
  ThemeQuickSwitch, settings button), then `<HelpMenu />`. Do:
  - Create `frontend/src/components/user-account/account-menu.tsx` (+ module css):
    renders nothing until `ui.sessionInitialized`; logged out ⇒ an icon/text Button
    (match the settings button's `variant="bare"` style) linking to `~/auth/login`;
    logged in ⇒ avatar button (port `components/user-account/avatar.tsx` + css from
    arkham) opening a dropdown (use earthborne's existing `ui/dropdown-menu` component —
    check how `HelpMenu` in `components/help-menu.tsx` uses it and copy that idiom)
    with: username (non-interactive label), link to Settings, Log out action calling
    `logout(client)`.
  - Insert `<AccountMenu />` in `masthead.tsx` inside the `nav`, after the
    `location !== "/settings"` block and before `<HelpMenu />`.
  - Port `status-pill`/`status-bubble` UI components now (used here and in Phase 8).
- [ ] **Task 7.5 — Manual QA (with Sergiu).** Sergiu deploys backend + frontend to the
  dev instance and walks through: signup → email arrives (or ConsoleMailer log) →
  verify → login → complete profile with local decks/campaigns present → username
  set → logout → login again → `GET /me` shows profile complete. Agent supports by
  reading logs/fixing issues.

**Checkpoint 7:**
```bash
npm run check -w frontend && npm run test -w frontend && npm run build -w frontend && npm run lint
```
Plus Task 7.5 sign-off from Sergiu.

---

### Phase 8 — Frontend sync engine

Goal: mirror-everything sync actually works across devices. The hardest phase — take it
task by task, keep tests green throughout.

- [ ] **Task 8.1 — Sync helpers.** Port `frontend/src/store/lib/sync.ts` (the
  `updateDeckSync*` state helpers; strip provider-availability functions —
  `isStorageProviderAvailable`/`isSyncedStorageProvider` don't exist in our
  single-provider world) and `frontend/src/store/lib/settings-sync.ts` + spec (defines
  the syncable subset of SettingsState; mirror arkham's carve-outs, and additionally
  exclude earthborne's `devModeEnabled` and `flags`). Add campaign-flavored variants of
  the per-item helpers (generic helper parameterized by `"decks" | "campaigns"`
  preferred over copy-paste).
- [ ] **Task 8.2 — Reconciliation.** Port
  `frontend/src/store/lib/sync-reconciliation.ts` + spec, rewritten to the §3.3
  algorithm (the arkham file is the structural reference — plan computation as pure
  functions returning a "plan" object `{downloads, uploads, deletions, conflicts}`, then
  an applier — but our version is simpler: no providers, no arkhamdb, plus a campaign
  dimension). Unit-test the plan function exhaustively against the §3.3 matrix (9 cases
  for items in both sets × dirty/clean × revision match/mismatch, plus the L-only and
  R-only cases, for decks AND campaigns).
- [ ] **Task 8.3 — Bootstrap + syncAll.** Complete `slices/sync.ts`:
  `bootstrapAuthenticatedState(client)` = fetch manifest → compute plan → apply
  (batch-download; upload never-synced local items; delete remotely-deleted; mark
  conflicts) → then blob sync for folders/settings/achievements (GET → compare →
  push/apply/conflict per §3.3 step 6) → set `lastSyncedAt`/statuses → `dehydrate`.
  Also expose `syncAll(client)` for the manual "Sync now" button and periodic retry.
  Port `saveFolders`, `loadRemoteFolders`, `applyRemoteFolders` and create the
  settings/achievements equivalents. Port `selectors/sync.ts`.
- [ ] **Task 8.4 — Deck mutation rewiring.** Every local deck mutation must push when
  authenticated. Earthborne's mutations live in `slices/app.ts` (createDeck, saveDeck,
  deleteDeck), `slices/data.ts` (importDeck, importFromFiles, duplicateDeck,
  addDeckToArchive), and deck-edit save paths. Pattern (reference arkham
  `store/lib/deck-crud.ts`, but do NOT restructure earthborne's slices into a
  deck-crud.ts — inject sync calls into the existing functions): after the local `set` +
  `dehydrate`, if `auth.status === "authenticated"` and profile complete, call a new
  `pushDeck(client, id)` (POST if no sync item exists, else PUT with stored revision;
  on 201/200 update sync item; on 409 store conflict; on network error set
  `status: "error"`). Deletion: `pushDeckDeletion(client, id, revision)` — local delete
  proceeds regardless; 409 on delete surfaces as a conflict item that offers
  re-download. On POST id-collision 409: re-key locally (§3.3 ID policy) and retry once.
  The http client reaches slice code via the context module (see how arkham threads
  `client` through slice methods — earthborne slices can import the client getter from
  `services/http-client.context.ts`).
- [ ] **Task 8.5 — Campaign mutation rewiring.** Campaign mutations are many and
  fine-grained (`slices/campaigns.ts`). Do NOT instrument each one with a network call.
  Introduce `scheduleCampaignPush(campaignId)` — debounced ~2 s, coalescing per id —
  invoked from a single choke point: audit `slices/campaigns.ts` for its `dehydrate`
  calls / a shared mutation helper and hook there (if mutations don't share a helper,
  add one small `persistCampaign(state, id)` used by all of them — mechanical refactor,
  no logic changes). Push = PUT with stored revision (POST if never synced), same
  409/error handling as decks. Also: campaign create/delete/duplicate push immediately
  (not debounced). Deck↔campaign linking mutates `campaign.deck_ids` ⇒ flows through
  the same choke point automatically.
- [ ] **Task 8.6 — Folders/settings/achievements push.** Same debounced-push approach:
  folder CRUD (data slice) → `saveFolders`; settings changes (settings slice `update...`
  actions) → settings push (only when the changed key is in the syncable subset);
  achievements toggles (achievements slice) → achievements push.
- [ ] **Task 8.7 — Login/logout data flows.** `login`/`initSession` already call
  `bootstrapAuthenticatedState` (auth slice port). Verify the mirror-everything
  semantics end-to-end in unit tests: local-only decks upload at bootstrap; logout
  (`clearAccountState`) removes synced data from the device and `dehydrate` persists the
  cleaned state; `handleUnauthorized` (session expiry mid-use) behaves like logout but
  preserves nothing account-owned. **Edge case to handle explicitly:** decks/campaigns
  created while logged OUT after a previous logout — they're local-only and upload at
  next login per §3.3 step 4.
- [ ] **Task 8.8 — Sync UI.** (a) Masthead: global sync status indicator (idle/saving/
  synced/error/conflict — use `status-pill`; reference arkham's masthead sync section).
  (b) Deck view/edit: per-deck status + conflict resolution dialog: "Keep this device's
  version" (PUT with server's current revision) / "Use the server version" (overwrite
  local) — port `resolveDeckConflictWithRefresh`/`resolveDeckConflictWithDiscard` and
  build campaign equivalents; campaign detail page gets the same treatment. (c) A
  "Sync now" button in settings. All strings i18n'd.
- [ ] **Task 8.9 — Cleanup.** Remove `defaultStorageProvider` from
  `frontend/src/store/slices/settings.types.ts` / settings slice / any UI that surfaces
  it, and the now-unused `StorageProvider` type in `frontend/src/utils/constants.ts`
  (grep for all usages first; `"shared"` provider usages related to deck sharing must
  keep working — only the storage-provider concept goes). Add a persist migration if the
  removed key breaks state shape (likely fine — extra key is ignored, but verify how the
  settings slice hydrates unknown keys).
- [ ] **Task 8.10 — Tests.** Port/adapt `slices/sync.spec.ts` and
  `lib/sync-reconciliation.spec.ts`; extend earthborne's `frontend/src/test/factories.ts`
  equivalents (or create minimal factories) for Deck/Campaign fixtures. Cover: the §3.3
  matrix; push-on-save happy path; 409 → conflict → both resolutions; campaign debounce
  coalescing (fake timers); logout clearing; bootstrap uploading local-only items.

**Checkpoint 8:**
```bash
npm run check -w frontend && npm run test -w frontend && npm run build -w frontend && npm run lint
```
Manual QA with Sergiu on the dev instance, two browsers (normal + private window as
"second device"): create deck on A → appears on B after login/sync; edit campaign on
B → visible on A after sync; conflicting edit (edit same deck on both while one is
offline via devtools) → conflict dialog appears and both resolutions work; logout on A
clears data; login again restores everything; achievements + folders + settings
round-trip. **This checkpoint is the core acceptance test of the whole project.**

---

### Phase 9 — Account management UI + sharing attribution

- [ ] **Task 9.1 — Settings: account section.** New section on the settings page
  (reference arkham's settings account section): shows username + email + verification
  state; change username (PATCH profile); change email (shows pending-email state +
  cancel button + resend); change password; delete account (typed-confirmation dialog —
  deletes server data, then behaves like logout). All via the Phase 6 request modules;
  all strings i18n'd.
- [ ] **Task 9.2 — Sharing attribution.** Frontend: share creation while logged in needs
  no UI change (cookie does the work — but ensure the share requests now go through a
  path that sends `credentials: "include"`; adjust `services/queries.ts`
  createShare/updateShare/deleteShare accordingly). Deck Guides directory + share view:
  display `author_name` when present (update the decklist search response type usages).
- [ ] **Task 9.3 — Share management parity.** Shares list in settings (earthborne shows
  shared decks somewhere — locate via `sharing` slice usages): for logged-in users,
  server-side ownership means shares survive client-id loss; no UI change required
  beyond confirming delete/update still work logged-in (they now authorize via account
  too, Task 5.2).
- [ ] **Task 9.4 — Docs.** Update `docs/api.md` (all new endpoints, env vars),
  `docs/architecture.md` (accounts + sync section), `docs/deployment.md` (SMTP, session,
  Turnstile env; note that DB backups now contain PII). If `CLAUDE.md` gains an accounts
  note, replicate the exact change to `AGENTS.md` and `GEMINI.md` (hard rule).

**Checkpoint 9:**
```bash
npm run check -w frontend && npm run test -w frontend && npm run build -w frontend && npm run check -w backend && npm run test -w backend && npm run lint
```
Manual QA: email change flow end-to-end; delete account end-to-end; a published guide
shows the author name.

---

### Phase 10 — Hardening & operations

- [ ] **Task 10.1 — Full regression pass.** Run every suite (`npm run test -w backend`,
  `-w shared`, `-w frontend`, `npm run build -w frontend`, `npm run lint`). Fix anything
  flaky. Grep for leftover TODOs introduced during the port (`grep -rn "phase 8" ...`
  stubs etc.) and resolve them.
- [ ] **Task 10.2 — Session/token cleanup job.** Expired sessions and verification
  tokens accumulate. Add cleanup on a low-tech trigger (no job queue): run
  `cleanupExpiredSessions` + `cleanupExpiredTokens` at backend startup and then on a
  `setInterval` (e.g. hourly) in `main.ts`, guarded so tests don't start timers.
- [ ] **Task 10.3 — Abuse guards review.** Confirm ported cooldowns are active
  (resend-verification, forgot-password). Confirm body-limit middleware covers the new
  routes (it's global — verify order in `app.ts`). Confirm signup works with Turnstile
  DISABLED (empty key) since that's the initial prod state; document enabling it in
  `docs/deployment.md`.
- [ ] **Task 10.4 — Manual QA checklist (final).** With Sergiu on the dev instance, run
  the consolidated checklist: Phase 7 flow + Phase 8 two-device flow + Phase 9 flows +
  regression of logged-out experience (everything works without an account exactly as
  before) + backup/restore from Settings still works for a logged-in user (restore
  should merge/upload per mirror-everything — verify behavior and agree with Sergiu on
  expected semantics before "fixing" anything here; if restore semantics are ambiguous,
  ask, don't guess).
- [ ] **Task 10.5 — Operational tasks (Sergiu, not the agent).** Production SMTP
  provider + credentials; SPF/DKIM DNS records for the sending domain; prod env vars
  (`FRONTEND_URL`, SMTP, `SESSION_*`, optional Turnstile keys); verify HTTPS + cookie
  `Secure` in prod; confirm DB backup handling now that it contains emails + password
  hashes.

**Checkpoint 10 (final):** all suites green; final QA checklist signed off; `Status:`
line in this file set to `complete`.

---

## 7. Pitfalls appendix (read before starting; re-read when stuck)

1. **Shell is fish.** Bash-isms in one-liners (`$(...)` works, `export FOO=bar` doesn't —
   use `env FOO=bar cmd` or fish syntax) — prefer passing env inline to commands.
2. **better-sqlite3 is synchronous** under Kysely's async API. `await` works fine;
   just don't assume interleaved-transaction behavior in tests. Kysely's
   `db.transaction().execute(async tx => ...)` is supported and used by the reference
   patterns — keep transactions short.
3. **SQLite `RETURNING`** works with better-sqlite3 + Kysely (`returningAll()`,
   `returning([...])`). If a query misbehaves, check Kysely dialect docs before
   restructuring.
4. **ISO-string time comparisons** in SQL are lexicographic — always compare against
   `new Date().toISOString()` bound params, never SQL `now()` (doesn't exist) or
   `datetime('now')` (different format: space separator, no `T`, no ms, no `Z` — MUST
   NOT be mixed with ISO strings).
5. **Cookie in dev**: `Secure` must be off outside production (config-driven) or
   localhost logins silently fail. SameSite pitfall in §3.5.
6. **Zod v4 vs v3**: check earthborne's zod version and existing schema idioms
   (`z.email()` top-level is v4 style, used in arkham). Match whatever earthborne's
   shared package already uses.
7. **i18n**: no hardcoded UI text — every ported arkham component that inlined text via
   `t(...)` needs its keys copied into earthborne's `en.json`. Missing keys render as
   raw key strings — grep the browser console warnings during QA.
8. **No inline styles**; CSS modules like the surrounding code. Arkham's auth CSS
   modules port nearly as-is but reference arkham CSS custom properties — verify each
   `var(--...)` exists in earthborne's `main.css`/theme, substitute the earthborne
   equivalent otherwise.
9. **Store slice registration**: forgetting to add a slice to
   `slices/index.ts` (`StoreState` + creator composition) or to the persist partialize
   produces silent "state resets on reload" bugs.
10. **`dehydrate` discipline**: every slice mutation that must survive reload calls
    `await dehydrate(get(), "app")` — mirror the surrounding code; missing calls surface
    as data loss on refresh (top QA-reported symptom to check).
11. **Do not touch card data / decklist / rules code paths** — the port is additive.
    If a change seems to require modifying unrelated systems, stop and ask.
12. **Email enumeration**: signup/forgot/resend responses must not reveal whether an
    email exists (uniform 200s where arkham does so). Keep arkham's exact response
    semantics.
13. **Timing-safe comparisons**: password verify already uses `timingSafeEqual`; token
    lookups go through SHA-256 hashes (constant work) — do not "optimize" these.
14. **Committing**: small commits per task; message style matches `git log` history
    (`feat:`/`fix:`/`refactor:` prefixes); never AI attribution; never `--no-verify`.
