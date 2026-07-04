# Phase 2 — Frontend sync engine (provider-agnostic)

Goal: with an account linked (credentials entered via console for now — UI
arrives in phase 3), local changes reach the remote replica within seconds and
remote changes appear locally on startup/interval/focus, with LWW conflict
handling. Built and verified against the `server` provider (phase 1); the
`google-drive` provider (doc 05) plugs into the same interface later.

Depends on phase 1.

## Design invariants

- The store and its ~46 `dehydrate(...)` call sites are untouched. The engine
  observes persistence; it never sits in the write path of a user action.
- Sync failures never block or corrupt local saves. Worst case: `status`
  becomes `"error"` and the dirty set keeps accumulating until retry.
- Applying remote changes goes through `useStore.setState` + `dehydrate`,
  exactly like `tabSyncListener` in `frontend/src/main.tsx`, so tab-sync
  broadcasts keep other tabs consistent for free.
- **Everything provider-specific lives behind `SyncProvider`** (Task 2.3).
  The engine never imports fetch wrappers or Drive APIs directly, and the
  cycle/conflict logic branches on declared capabilities, not provider ids.

## Provider interface

```ts
type SyncChange = {
  type: SyncEntityType;
  id: string;
  revision: string;      // opaque per-entity version (server: seq/revision
                         // as string; drive: file revision id)
  deleted: boolean;
  schema_version: number;
  data?: unknown;        // envelope
};

type SyncProvider = {
  id: "server" | "google-drive";
  capabilities: {
    compareAndSet: boolean; // server: true; drive: false (best-effort LWW)
  };
  pull(cursor: string | null): Promise<{ changes: SyncChange[]; cursor: string }>;
  push(entities: SyncPushEntity[]): Promise<SyncPushResult[]>;
  accountInfo(): Promise<SyncAccountInfo>;
  deleteAllRemote(): Promise<void>;
};
```

Cursors and revisions are **opaque strings** end-to-end, so Drive page tokens
and file revision ids fit the same shape as the server's integers (the server
provider stringifies its `seq`/`revision` numbers). Connect / sign-in flows
are provider-specific and live outside this interface (slice actions below
for `server`; doc 05 for Google).

## Task 2.1 — Sync slice

New `frontend/src/store/slices/sync.ts` + `sync.types.ts`, registered in
`frontend/src/store/slices/index.ts`:

```ts
type SyncedFingerprint = {
  revision: string;            // opaque, provider-issued
  // decks/campaigns: date_update at last successful sync.
  // folders (no timestamps): stable-JSON hash of the envelope.
  fingerprint: string;
};

type SyncState = {
  enabled: boolean;
  provider?: "server" | "google-drive";
  // `server` provider credentials (google-drive keeps its tokens in the
  // provider, see doc 05):
  username?: string;           // display only; credentials derive from it
  accountId?: string;          // derived: sha256 of normalized username
  token?: string;              // derived: PBKDF2(password); see note below
  cursor: string | null;       // opaque provider cursor (server seq / Drive page token)
  synced: Record<string, SyncedFingerprint>; // key: `${type}:${id}`
  // runtime-only (not persisted):
  status: "disabled" | "idle" | "syncing" | "offline" | "error" | "reauth_required";
  lastSyncedAt?: string;
  lastError?: string;
};

type SyncSlice = {
  sync: SyncState;
  // `server` provider connect flows. Both derive credentials from
  // username+password (Task 2.0), then:
  // create = POST account (409 if taken); link = GET account (401 if wrong).
  createSyncAccount(username: string, password: string): Promise<void>;
  linkSyncAccount(username: string, password: string): Promise<void>;
  // `google-drive` connect is added in doc 05 (connectGoogleSync()).
  disableSync(opts: { deleteRemote: boolean }): Promise<void>;
  runSyncCycle(): Promise<void>;              // exposed for UI "sync now"
};
```

Every connect flow finishes by running the first-sync merge (Task 2.6). The
plaintext password is never stored — only the derived `token` (and `username`
for display in settings). `reauth_required` exists for providers with
expiring sessions (Drive); the server provider never emits it.

Persistence: add `sync` to the `AppState` pick in
`frontend/src/store/persist/index.ts` so `enabled`/`token`/`cursor`/`synced`
survive reloads (strip the runtime-only fields in the partialize, mirroring
how other slices handle ephemeral state). Bump `VERSION` in
`persist/storage.ts` and add a migration in `persist/migrations/` that seeds
an empty sync state (follow `0002-add-client-id.ts`).

Token storage note: the derived token is password-equivalent, but IndexedDB is
the same trust level as the rest of the user's data; this matches how
`clientId` already gates shared-deck writes. Fine for this threat model —
anyone with local storage access already has the decks themselves.

## Task 2.0 — Credential derivation helper

New `deriveSyncCredentials(username, password)` in `frontend/src/utils/`
(alongside `crypto.ts`), implementing the scheme specified in phase 1
Task 1.3: NFKC/trim/lowercase normalization, `account_id` via WebCrypto
`crypto.subtle.digest`, `token` via `crypto.subtle.deriveBits` with
PBKDF2-SHA256 at 600k iterations. Async (takes a few hundred ms by design);
callers surface a busy state. Unit-test with fixed vectors so the backend
tests and any future client agree on the exact derivation (the vectors are
the compatibility contract — changing them strands every account).

## Task 2.2 — Entity snapshot & dirty computation

New `frontend/src/store/lib/sync-entities.ts` (pure functions, colocated
`sync-entities.spec.ts`):

- `collectSyncEntities(state): Map<key, Envelope>` — builds the envelope per
  entity from `data.decks` (+ `data.history[id]`, `data.deckFolders[id]`),
  `data.campaigns`, `data.folders`. Share markers (`sharing.decks`) are
  per-device and excluded (see phase 1 envelope rationale).
- `fingerprintOf(type, envelope): string` — a hash of the **canonical
  serialized envelope**: stable-stringify (sorted keys) of the exact JSON the
  provider transmits. One rule for all types; no per-type timestamp logic.
  Crucially, fingerprint pulled entities from their *received* canonical
  bytes before any Zod parse fills in `.default()` fields — otherwise a
  pulled entity never byte-matches its local re-collection and the engine
  re-pushes forever (see the loop guard in Task 2.4). `date_update` still
  drives LWW *resolution*; fingerprints only answer "did content change".
- `computeDirty(entities, synced): { upserts: key[], deletes: key[] }` —
  upsert when key is missing from `synced` or fingerprints differ; delete
  when `synced` has a key that no longer exists locally.
- `applyRemoteChanges(state, changes): Partial<StoreState>` — folds pulled
  envelopes back into `data.decks/campaigns/folders/history/deckFolders`;
  processes tombstones (delete the deck, its map entries — reuse the
  unlink-from-campaign logic shape in `deleteDeck` in
  `frontend/src/store/slices/app.ts`); returns a partial for `setState`.
  Apply folders before decks that reference them; tolerate references to
  entities that arrive in a later page (campaign `deck_ids` pointing at a
  not-yet-pulled deck must not crash selectors — verify the UI already
  tolerates this, since `deleteDeck` can leave the same transient state).

Edge rules for `applyRemoteChanges`:

- **Skip decks with open local edits:** if `state.deckEdits[id]` exists, defer
  that change (keep it queued by not advancing `synced[key]`; it will re-apply
  on a later cycle after the user saves or discards).
- A remote tombstone for a deck with open edits is also deferred, not applied.
- Never touch `metadata`, `lists`, or other non-data slices.

**Verify:** `npm run test -w frontend` (vitest specs for all four functions:
round-trip envelope↔state, dirty detection incl. folder-only moves, tombstone
application, open-edits deferral).

## Task 2.3 — Provider interface + `server` provider

New `frontend/src/store/services/sync-providers/` containing:

- `types.ts` — the `SyncProvider` interface from the top of this doc.
- `server.ts` — implements it against the phase-1 API using `apiV2Request`
  from `requests/shared.ts`:
  - account calls: `syncCreateAccount()`, `syncGetAccount()`, `syncDeleteAccount()`
  - `pull(cursor)` — pages `/v2/sync/changes` until exhausted, concatenates
  - `push(entities)` — chunks to ≤50 entities per request
  - `capabilities.compareAndSet = true`
- `index.ts` — provider registry keyed by id; reads `VITE_SYNC_PROVIDERS` to
  decide what a build offers (doc 05 registers `google-drive` here later).

Parse responses with the Zod DTOs from `shared` before returning. The engine
receives a constructed provider; nothing outside this directory knows about
HTTP or Drive.

## Task 2.4 — SyncManager service

New `frontend/src/store/services/sync-manager.ts` — a module-level singleton
(same lifecycle pattern as `TabSync`), started from `init()` in
`frontend/src/main.tsx` after store init:

**Leader election (multi-tab):** the app supports multiple open tabs
(that's what `TabSync` exists for), so only one tab may run the sync loop.
Acquire a Web Lock (`navigator.locks.request("eb-sync-leader", ...)`) and
hold it for the tab's lifetime; only the holder schedules cycles. Followers
do nothing — they receive results through the existing tab-sync broadcast,
and the lock transfers automatically when the leader closes. Without this,
two tabs double-push, race the cursor, and clobber each other's applied
pulls.

Triggers for `runSyncCycle()` (leader only):

- store init (when `sync.enabled`)
- after `dehydrate` completes for `"app"` writes — add a post-write notifier
  hook in `frontend/src/store/persist/index.ts` (a registered callback, so
  `persist/` doesn't import the sync engine), debounced ~3 s
- `setInterval` every 60 s and `visibilitychange` → visible
- exponential backoff retry while `status === "offline" | "error"`
  (cap ~5 min); `navigator.onLine`/`online` event short-circuits the wait

Cycle algorithm (single-flight; if a cycle is running, mark re-run-needed):

```
1. pull:   { changes, cursor } = provider.pull(sync.cursor)
2. apply:  partial = applyRemoteChanges(state, changes)
           useStore.setState(partial); await dehydrate(state, "app")
           update sync.synced for applied keys; advance sync.cursor
3. diff:   { upserts, deletes } = computeDirty(collectSyncEntities(state), synced)
4. push:   results = provider.push(envelopes with base_revision from synced)
5. ok:     record new revision + fingerprint in synced
   conflict per entity (compareAndSet providers reject stale writes):
     - remote date_update >= local → remote wins: apply remote copy locally;
       if local had real divergence (fingerprint differs from remote),
       preserve local as a conflicted copy (Task 2.5)
     - local newer → re-push with base_revision = remote's current revision
6. persist sync state via dehydrate("app")
```

Capability branch: when `capabilities.compareAndSet` is false (Drive), step 4
cannot be rejected — conflicts are instead detected in step 2, when a pulled
change arrives for an entity that is also locally dirty. The same resolution
rules apply (LWW by `date_update`, conflicted copy on real divergence); what
is lost is only the guarantee for writes racing inside one pull interval.
The engine implements both branches now, tested with a fake non-CAS provider,
so doc 05 plugs in without engine changes.

Ordering detail: step 2 must update `synced` fingerprints *before* step 3 runs,
so applied remote changes aren't immediately re-pushed as "dirty".

**Loop guard:** the cycle itself ends with `dehydrate("app")`, which fires
the post-write notifier that schedules cycles. Hard rule: a cycle that found
zero dirty entities and pulled zero changes schedules nothing. Combined with
canonical-bytes fingerprinting (Task 2.2) this is what prevents a quiet
infinite sync loop — add a vitest spec that runs two cycles back-to-back on
identical state and asserts the second is a no-op.

**Crash-window idempotency:** if a push succeeds but the browser dies before
the updated `synced` map persists, the entity re-pushes on restart with a
stale base revision → a false conflict. Resolution rule: when a conflict's
local and remote canonical bytes are equal, adopt the remote revision as a
no-op — never create a conflicted copy for identical content. (Clock-skew
oddities collapse into the same rule: content equality always wins over
timestamp comparison.)

Deck-save atomicity: a batch push contains every dirty entity from one
snapshot, so a save that creates a new deck version plus updated history lands
in a single request (≤50 entities) and other devices never observe a dangling
`history` reference.

## Task 2.5 — Conflicted copies

In the conflict branch, when the losing local version genuinely diverges:

- Deck: clone with `id: randomId()` (`@/utils/crypto`), name suffixed via a new
  i18n key (e.g. `sync.conflicted_copy` → "{{name}} (conflicted copy)"),
  empty history, no share marker; insert into `data.decks` + `data.history`.
- Campaign: same treatment; keep `deck_ids` as-is (both point at the same
  decks, which is acceptable — decks may be linked from several campaigns
  only transiently until the user cleans up; note this in the UI copy).
- Folder: LWW only, no copies (cheap to recreate; avoids folder-tree noise).

## Task 2.6 — First-sync merge (engine part)

`createSyncAccount`/`linkSyncAccount` with pre-existing local data:

1. Pull everything (cursor `null`).
2. Union by entity id. Collisions: LWW by `date_update`; loser → conflicted
   copy only when contents actually differ.
3. Mark all server-applied entities in `synced`, then run a normal cycle so
   every local-only entity is pushed.

This same path handles both "fresh device joins an account with data" and
"account is empty, upload my existing collection" — no special cases.

## Task 2.7 — Forced-direction sync (restore & recovery)

Normal cycles are LWW — which is exactly wrong after a backup restore: the
restored entities carry *older* `date_update`s than the remote replica, so
the next cycle would quietly revert the restore. Two explicit engine modes,
exposed as slice actions for the phase-3 UI:

- `forcePushLocal()` — "local wins": re-fetch current remote revisions
  (pull, but apply nothing), clear `synced` fingerprints, push **all** local
  entities using those revisions as base (so it's still race-safe on CAS
  providers), and tombstone remote entities that don't exist locally.
  Content-equal entities are skipped as no-ops.
- `forcePullRemote()` — "remote wins": discard local dirty state, apply the
  full remote set (Task 2.6 semantics with LWW disabled), delete local
  entities absent from the remote. Decks with open `deckEdits` still defer.

`restore()` in `frontend/src/store/slices/app.ts` must **pause the sync loop**
(a manager-level latch) until the user has confirmed a direction in the
restore dialog (phase 3 Task 3.4) — no automatic cycle may run between the
restore and the user's choice.

**Phase gate verification:**

```
npx biome check frontend/src/store
npm run check -w frontend
npm run test -w frontend
npm run build -w frontend
```

Manual end-to-end (see CLAUDE.md — do **not** start a dev server; use the
user-run instance at https://dev.harababurel.com once the backend side is
deployed there): two isolated Playwright browser contexts, link both to one
account with the same username/password, edit a deck in context A, observe it appear in
context B after the interval/focus trigger; force a conflict (edit the same
deck in both while one is offline) and confirm a conflicted copy appears.
