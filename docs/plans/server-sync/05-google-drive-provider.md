# Phase 5 — `google-drive` provider (hosted deployment)

Goal: on the hosted earthborne.build instance, a user signs in with Google and
their decks/campaigns/folders sync across devices via their own Drive
`appDataFolder`. **No user data and no Google credentials are stored on the
server** — the browser talks to Google directly. Backup is a side effect of
syncing: the data lives in the user's Google account.

Depends on phase 2 (the engine and its non-CAS conflict branch are already
built and tested against a fake provider). The `server` provider (phases 1–3)
should ship first and soak; this phase is additive.

## Design constraints accepted up front

- **No compare-and-set.** Drive does not reliably support conditional writes,
  so `capabilities.compareAndSet = false`. Conflicts are detected by the
  engine's pull-before-push branch; writes racing inside a single pull
  interval can lose an update (the loser still exists locally on the other
  device and resurfaces as a conflict on its next cycle in most — not all —
  interleavings). This is the documented trade for "no user data on our
  server". Do not attempt to build locking on top of Drive.
- **Expiring sessions.** Browser-issued Drive access tokens last ~1 hour and
  cannot always be renewed silently. The engine's `reauth_required` status
  exists for exactly this; sync pauses instead of erroring, and the UI offers
  one-click reconnect. Local-first design means a paused sync loses nothing.
- **Google dependency is frontend-only.** The backend gains no routes, no
  outbound calls, no libraries. The hosted deployment's only Google artifact
  is an OAuth client id baked into the frontend build.

## Task 5.1 — Google Cloud / OAuth setup (operational, not code)

- Google Cloud project for earthborne.build; OAuth consent screen; web OAuth
  client id. Authorized origins: `https://earthborne.build` (plus the dev
  instance origin for testing).
- Scopes: `openid` (identity for display) + `https://www.googleapis.com/auth/drive.appdata`.
  `drive.appdata` is a **sensitive** scope — expect Google's app verification
  process before unrestricted public use (unverified apps are capped and show
  a warning screen). Start verification early; it is the long pole of this
  phase.
- Config: `VITE_GOOGLE_CLIENT_ID` env var for the frontend build;
  `VITE_SYNC_PROVIDERS="google-drive"` on the hosted deployment.
- Self-hosters can also use this provider by registering their own client id
  — document in `docs/deployment.md`, but the supported default for
  self-hosting remains the `server` provider.

## Task 5.2 — Auth: Google Identity Services token client

New `frontend/src/store/services/sync-providers/google-auth.ts`:

- Load the GIS script lazily (dynamic `import()`-style injection only when the
  provider is offered — keep it out of the base bundle and off self-host
  deployments entirely).
- `initTokenClient` with the scopes above. `connectGoogleSync()` (new slice
  action, mirrors the server provider's connect flows): interactive
  `requestAccessToken()` → user consent popup → access token held **in
  memory only** (never IndexedDB — it's short-lived and re-obtainable;
  persisting it buys nothing and widens exposure).
- Silent renewal: on 401 from Drive or token expiry, try
  `requestAccessToken({ prompt: "" })`; that succeeds while a Google session
  exists. If it fails (no session / popup blocked), set
  `sync.status = "reauth_required"` and stop the loop until the user clicks
  reconnect. Never open a popup without a user gesture.
- Persisted across reloads: only `{ provider: "google-drive", enabled,
  cursor, synced }` plus a display name/email from the `openid` profile.
  A reload therefore starts in `reauth_required` until the silent renewal
  succeeds (usually instantly, invisible to the user).

## Task 5.3 — Drive data layout

All under `appDataFolder` (hidden app-scoped storage; the user sees only
"earthborne.build" in Drive → Settings → Manage apps, with a delete option —
which is the remote-wipe path, see 5.6):

```
appDataFolder/
  manifest.json                 # { format: 1 } — reserved for future layout migrations
  deck_<id>.json                # envelope, exactly the phase-1 shapes
  campaign_<id>.json
  folder_<id>.json
```

- One file per entity; entity type + id encoded in the filename, and also in
  `appProperties` (`{ type, id, schema_version, date_update }`) so metadata
  is queryable without downloading content.
- `SyncChange.revision` = the file's `headRevisionId`; deletes are real file
  deletions (Drive's changes feed reports removals — no tombstone files
  needed).
- Envelope JSON is identical to the server provider's (shared Zod schemas
  validate on read; a corrupt/foreign file in the folder is skipped with a
  logged warning, never fatal).

## Task 5.4 — Provider implementation

New `frontend/src/store/services/sync-providers/google-drive.ts` implementing
`SyncProvider` (registered in the provider registry from Task 2.3):

- `pull(cursor)`: first call uses `changes.getStartPageToken` + a full listing
  of `appDataFolder` (initial state); afterwards `changes.list(pageToken)`
  filtered to our files, mapped to `SyncChange[]`. Drive page tokens are the
  opaque cursor — this is why the engine's cursor is a string.
- `push(entities)`: per-entity `files.create` / `files.update` (multipart
  upload: metadata + JSON content) and `files.delete`. No batch atomicity —
  order pushes so a deck's new version uploads before the history-bearing
  envelope that references it, minimizing the dangling-reference window that
  the server provider's batched push avoids entirely.
- `accountInfo()`: profile name/email + entity counts from a files.list.
- `deleteAllRemote()`: delete all our files in `appDataFolder`.
- Backoff on Drive 403 rate-limit / 5xx responses maps to the engine's
  existing retry states; 401 triggers the Task 5.2 renewal path.
- Per-user Drive quota is ~12k queries/min — a sync cycle for a big
  collection is a few dozen requests; no realistic collision, but the
  push chunker should still cap concurrent requests (~4).

## Task 5.5 — Testing strategy

Real-Drive integration tests are impractical in CI (live Google account,
consent, quota). Split instead:

- Unit: pure mapping functions (change-feed entry → `SyncChange`, envelope ↔
  file body, filename/appProperties codec) — vitest, no network.
- Engine-level: the phase-2 fake non-CAS provider already covers the
  conflict/cursor semantics this provider declares.
- A thin manual smoke script (developer-run, real Google test account,
  documented in the doc header of the provider file): connect, push, pull
  from a second browser context, delete.

The `fetch`-level Drive client should be a small hand-rolled module (the
googleapis npm client is enormous and node-oriented) — which also keeps it
trivially replaceable in unit tests.

## Task 5.6 — UI additions (extends phase 3)

- Settings section, provider chooser (only when a build offers both):
  radio between "This server" and "Google Drive", each with a one-line
  trade-off description.
- Google flow: single "Sign in with Google" button (branding-compliant),
  connected state shows the Google account email, `reauth_required` renders
  as a non-alarming "Reconnect to Google" button + paused badge on the
  status indicator.
- Copy must state plainly: data lives in the user's Google account, not on
  earthborne.build; deleting the app's Drive access (or "Disable & delete
  server data", which becomes "…delete Drive data") removes the replica;
  local data always survives.
- i18n keys under `settings.sync.google.*` in `en.json` + `de.json`.

## Task 5.7 — Docs

- `docs/architecture.md`: the two-provider model and the no-user-data claim
  for the hosted instance (this is a marketing-relevant privacy property —
  state it precisely: the server never receives deck data or Google tokens).
- `docs/deployment.md`: hosted setup (client id, consent screen, verification
  status) and the self-host-with-own-client-id variant.
- Privacy note on the About page (phase-3 style i18n'd copy) if the hosted
  instance enables this.

**Phase gate verification:**

```
npx biome check frontend/src
npm run check -w frontend
npm run test -w frontend
npm run build -w frontend
```

Manual pass per Task 5.5's smoke script, run against the dev instance
(https://dev.harababurel.com) with a test Google account: connect, two-context
sync, forced conflict (offline edit both sides) → conflicted copy, token
expiry (revoke via Google account settings) → `reauth_required` → reconnect,
and Drive → Manage apps → delete data → next cycle detects an empty remote
and re-uploads (first-sync merge semantics, not data loss).
